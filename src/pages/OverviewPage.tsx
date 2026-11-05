import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Flame,
  GraduationCap,
  MapPin,
  ScanLine,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { adminService } from '../services/adminService';
import { studentService } from '../features/students/services/studentService';
import { toast } from '../context';
import type { StudentRosterStats } from '../features/students/models';
import type { DashboardMetrics, EventRecord } from '../types';
import hawi from '../assets/illustrations/Hawi Tap Card.png';

const manilaDate = () =>
  new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

const formatDay = (date: string) =>
  new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date(`${date}T00:00:00+08:00`));

const number = (value?: number) => (value === undefined ? '—' : value.toLocaleString());

const COURSE_COLORS = [
  '#7026B7', // Brand Purple
  '#2563EB', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple Light
  '#06B6D4', // Cyan
  '#64748B', // Slate
];

function formatEventDates(startDate?: string, endDate?: string): string {
  if (!startDate) return '';
  const s = new Date(`${startDate}T00:00:00`);
  const sMonth = s.toLocaleDateString('en-US', { month: 'long' });
  const sDay = s.getDate();
  const sYear = s.getFullYear();

  if (!endDate || endDate === startDate) {
    return `${sMonth} ${sDay}, ${sYear}`;
  }

  const e = new Date(`${endDate}T00:00:00`);
  const eMonth = e.toLocaleDateString('en-US', { month: 'long' });
  const eDay = e.getDate();
  const eYear = e.getFullYear();

  if (sYear === eYear && sMonth === eMonth) {
    return `${sMonth} ${sDay} – ${eDay}, ${sYear}`;
  } else if (sYear === eYear) {
    return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${sYear}`;
  }
  return `${sMonth} ${sDay}, ${sYear} – ${eMonth} ${eDay}, ${sYear}`;
}

type SlideItem =
  | { type: 'overview'; id: 'all'; title: string; subtitle: string }
  | { type: 'event'; id: string; event: EventRecord; title: string; subtitle: string };

/* -------------------------------------------------------------------------- */
/* Semi-Circle Radial Arc Gauge (Image 4 top-right & Image 1 top-right)       */
/* -------------------------------------------------------------------------- */
function RadialSemiGauge({
  percentage,
  value,
  total,
  label = 'Cards Issued',
}: {
  percentage: number;
  value: number;
  total: number;
  label?: string;
}) {
  const safePct = Math.max(0, Math.min(100, percentage));
  // Radius = 68, Arc length of semi-circle = PI * r
  const r = 68;
  const circumference = Math.PI * r;
  const strokeDashoffset = circumference - (safePct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-32 w-56 flex items-center justify-center">
        <svg viewBox="0 0 200 115" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="radialGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#7026B7" />
              <stop offset="100%" stopColor="#9333EA" />
            </linearGradient>
          </defs>
          {/* Background Track Arc */}
          <path
            d="M 28 102 A 72 72 0 0 1 172 102"
            fill="none"
            stroke="#F1EEF4"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Active Progress Arc */}
          <path
            d="M 28 102 A 72 72 0 0 1 172 102"
            fill="none"
            stroke="url(#radialGaugeGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center Text inside Arc */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-1 text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#756883]">SUMMARY</span>
          <span className="text-3xl font-black text-[#24133F] tracking-tight">{safePct}%</span>
          <span className="text-[11px] font-semibold text-[#756883]">{label}</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-semibold text-[#756883]">
        <strong className="text-[#24133F]">{value.toLocaleString()}</strong> of {total.toLocaleString()} Active Students
      </p>
    </div>
  );
}

export function OverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [roster, setRoster] = useState<StudentRosterStats | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const [, setLoading] = useState(true);

  // View switches for Image 4 & Image 3 visualization options
  const [volumeView, setVolumeView] = useState<'bars' | 'wave'>('bars');
  const [heatmapView, setHeatmapView] = useState<'grid' | 'bars'>('grid');

  const loadMetrics = useCallback(async (eventId?: string) => {
    try {
      const res = await adminService.getMetrics(eventId);
      setMetrics(res);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Could not load metrics.';
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      setLoading(true);
      try {
        const [eventsRes, rosterRes, metricsRes] = await Promise.all([
          adminService.getEvents(),
          studentService.getRosterStats(),
          adminService.getMetrics(),
        ]);
        if (isMounted) {
          setEvents(eventsRes);
          setRoster(rosterRes);
          setMetrics(metricsRes);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.error?.message || 'Could not load overview data. Showing cached view.';
        toast.error(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sort events: ongoing first, upcoming, then completed
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const order: Record<string, number> = { ongoing: 0, upcoming: 1, completed: 2, cancelled: 3 };
      const aOrder = order[a.status?.toLowerCase() || ''] ?? 4;
      const bOrder = order[b.status?.toLowerCase() || ''] ?? 4;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime();
    });
  }, [events]);

  const slides = useMemo<SlideItem[]>(() => {
    return [
      {
        type: 'overview',
        id: 'all',
        title: 'Overview',
        subtitle: "Here's your overall attendance across all events.",
      },
      ...sortedEvents.map((evt) => ({
        type: 'event' as const,
        id: evt.id,
        event: evt,
        title: evt.name,
        subtitle: `${formatEventDates(evt.start_date, evt.end_date)} · Notre Dame of Midsayap College`,
      })),
    ];
  }, [sortedEvents]);

  const goToSlide = useCallback(
    (index: number, customDir?: 'right' | 'left') => {
      if (slides.length === 0) return;
      const safeIndex = (index + slides.length) % slides.length;
      const dir = customDir ?? (safeIndex >= currentIndex ? 'right' : 'left');
      setDirection(dir);
      setCurrentIndex(safeIndex);
      const slide = slides[safeIndex];
      if (slide) {
        void loadMetrics(slide.id === 'all' ? undefined : slide.id);
      }
    },
    [slides, currentIndex, loadMetrics]
  );

  const handlePrev = () => goToSlide(currentIndex - 1, 'left');
  const handleNext = () => goToSlide(currentIndex + 1, 'right');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowLeft') {
        goToSlide(currentIndex - 1, 'left');
      } else if (e.key === 'ArrowRight') {
        goToSlide(currentIndex + 1, 'right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, goToSlide]);

  const currentSlide = slides[currentIndex] || slides[0];
  const isOverview = currentSlide?.type === 'overview';
  const currentEvent = currentSlide?.type === 'event' ? currentSlide.event : null;

  const days = metrics?.attendanceByDay ?? [];
  const locations = metrics?.locationActivity ?? [];
  const totalPeriodScans = days.reduce((sum, d) => sum + d.timeIns + d.timeOuts, 0);
  const totalTimeIns = days.reduce((sum, d) => sum + d.timeIns, 0);
  const totalTimeOuts = days.reduce((sum, d) => sum + d.timeOuts, 0);
  const inPercentage = totalPeriodScans ? Math.round((totalTimeIns / totalPeriodScans) * 100) : 0;
  const outPercentage = totalPeriodScans ? Math.round((totalTimeOuts / totalPeriodScans) * 100) : 0;

  const locationPeak = Math.max(1, ...locations.map((location) => location.scansToday));
  const hasCheckpointActivity = locations.some((location) => location.scansToday > 0);
  const today = days.at(-1);
  const scansToday = today ? today.timeIns + today.timeOuts : undefined;
  const cardRate = roster?.active ? Math.round((roster.with_cards / roster.active) * 100) : 0;
  const hasAttendance = days.some((day) => day.timeIns + day.timeOuts > 0);

  // Formatted data for Volume Chart
  const volumeChartData = useMemo(() => {
    return days.map((d) => ({
      rawDate: d.date,
      name: formatDay(d.date),
      timeIns: d.timeIns,
      timeOuts: d.timeOuts,
      total: d.timeIns + d.timeOuts,
    }));
  }, [days]);

  // Course distribution data for Donut Chart
  const courseData = useMemo(() => {
    const raw = metrics?.courseDistribution ?? [];
    if (raw.length === 0) {
      return [{ name: 'No Students', count: 1 }];
    }
    return raw;
  }, [metrics]);

  const totalCourseStudents = useMemo(() => {
    return (metrics?.courseDistribution ?? []).reduce((acc, c) => acc + c.count, 0) || roster?.active || 0;
  }, [metrics, roster]);

  // Hourly distribution for Heatmap / Bar view
  const hourlyData = useMemo(() => {
    return metrics?.hourlyActivity ?? [];
  }, [metrics]);

  const peakHourlyScan = Math.max(1, ...hourlyData.map((h) => h.total));
  const peakHourItem = useMemo(() => {
    if (hourlyData.length === 0) return null;
    return [...hourlyData].sort((a, b) => b.total - a.total)[0];
  }, [hourlyData]);

  // Helper for tile color based on density (Image 4 heatmap style)
  const getHeatTileColor = (count: number) => {
    if (count === 0) return { bg: 'bg-[#FAF8FC]', text: 'text-[#897B96]', border: 'border-[#EDE8F1]' };
    const ratio = count / peakHourlyScan;
    if (ratio > 0.65) return { bg: 'bg-[#7026B7]', text: 'text-white', border: 'border-[#5B21B6]' }; // Peak Rush
    if (ratio > 0.4) return { bg: 'bg-[#FDBA74]', text: 'text-[#7C2D12]', border: 'border-[#FB923C]' }; // Busy
    if (ratio > 0.18) return { bg: 'bg-[#FEF08A]', text: 'text-[#713F12]', border: 'border-[#FDE047]' }; // Moderate
    return { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', border: 'border-[#A7F3D0]' }; // Low
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Banner Carousel with Outside Arrows and Outside Top Dots */}
      <div className="space-y-2">
        {/* Top Pagination Dots (Outside, above the banner) */}
        {slides.length > 1 && (
          <div className="flex justify-center items-center gap-2 pt-1 pb-1">
            {slides.map((slide, idx) => {
              const isActive = currentIndex === idx;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(idx, idx >= currentIndex ? 'right' : 'left')}
                  className={`h-2 rounded-full transition-all duration-300 ease-out cursor-pointer ${
                    isActive
                      ? 'w-7 bg-[#7026B7] shadow-xs'
                      : 'w-2 bg-[#D1C7DF] hover:bg-[#7026B7]/50'
                  }`}
                  title={slide.title}
                  aria-label={`Go to slide ${idx + 1}: ${slide.title}`}
                />
              );
            })}
          </div>
        )}

        {/* Banner with Outside Left & Right Arrows + Hawi popping out above and right */}
        <div className="relative pt-6 sm:pt-8 flex items-center gap-2 sm:gap-3">
          {/* Left Arrow outside the banner */}
          {slides.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="shrink-0 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white hover:bg-purple-50 active:scale-90 text-[#7026B7] border border-[#E5E0EB] shadow-xs hover:border-[#7026B7]/40 transition-all duration-200 cursor-pointer z-20"
              aria-label="Previous event"
              title="Previous event (←)"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:-translate-x-0.5" />
            </button>
          )}

          {/* Purple Banner (overflow-visible so Hawi breaks out of the frame!) */}
          <section className="relative flex-1 rounded-[28px] bg-[#351567] px-6 py-7 text-white sm:px-9 sm:py-9 shadow-xs overflow-visible">
            {/* Hawi Mascot positioned out of the top and right frame */}
            <img
              src={hawi}
              alt="Hawi holding an RFID card"
              className="pointer-events-none absolute bottom-0 -right-2 sm:right-3 z-10 h-[calc(100%+32px)] sm:h-[calc(100%+46px)] w-auto max-w-[40%] object-contain object-bottom drop-shadow-lg"
            />

            {/* Main Banner Text Area with Directional Slide-in Animation */}
            <div
              key={`banner-${currentIndex}`}
              className={`relative z-10 max-w-[72%] sm:max-w-[66%] ${
                direction === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'
              }`}
            >
              {/* Date & Status */}
              <div className="flex items-center gap-2">
                {!isOverview && currentEvent?.status && (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold capitalize border ${
                      currentEvent.status === 'ongoing'
                        ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
                        : currentEvent.status === 'completed'
                        ? 'bg-purple-300/20 text-purple-200 border-purple-300/30'
                        : 'bg-blue-400/20 text-blue-300 border-blue-400/30'
                    }`}
                  >
                    {currentEvent.status}
                  </span>
                )}
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D7B9FA]">
                  {manilaDate()}
                </p>
              </div>

              {/* Banner Title & Subtitle */}
              <div className="mt-3 min-h-[70px]">
                <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl text-white transition-all">
                  {currentSlide?.title}
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#EEE1FA]">
                  {currentSlide?.subtitle}
                </p>
              </div>
            </div>
          </section>

          {/* Right Arrow outside the banner */}
          {slides.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="shrink-0 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white hover:bg-purple-50 active:scale-90 text-[#7026B7] border border-[#E5E0EB] shadow-xs hover:border-[#7026B7]/40 transition-all duration-200 cursor-pointer z-20"
              aria-label="Next event"
              title="Next event (→)"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Scans today</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><ScanLine className="h-4 w-4" /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-black text-[#24133F]">{number(scansToday)}</p>
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              <TrendingUp className="h-3 w-3 mr-0.5" /> Active
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Active students</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><Users className="h-4 w-4" /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-black text-[#24133F]">{number(roster?.active)}</p>
            <span className="inline-flex items-center text-[11px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md">
              Enrolled
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Cards assigned</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><CreditCard className="h-4 w-4" /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-black text-[#24133F]">{cardRate}%</p>
            <span className="inline-flex items-center text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md">
              Coverage
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Checkpoints</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><MapPin className="h-4 w-4" /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-black text-[#24133F]">{locations.length}</p>
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              Online
            </span>
          </div>
        </div>
      </section>

      {/* Row 1: Attendance Volume Chart (Image 4 bottom-right & Image 3) + Radial Semi-Circle Arc Gauge (Image 4 top-right & Image 1) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Attendance Volume & Flow Card */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#756883]">Attendance Activity</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <h2 className="text-2xl font-black text-[#24133F]">{totalPeriodScans.toLocaleString()} Total Scans</h2>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    ↑ Active Volume
                  </span>
                </div>
                <p className="text-xs text-[#756883] mt-1">
                  {currentEvent ? `Scans recorded for ${currentEvent.name}` : 'Recorded tap volume across all checkpoints'}
                </p>
              </div>

              {/* View Switcher: Stadium Bars vs Smooth Spline Curve (Image 4 bottom right!) */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <div className="flex items-center rounded-xl bg-[#FAF8FC] p-1 border border-[#EDE8F1] text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setVolumeView('bars')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      volumeView === 'bars'
                        ? 'bg-white text-[#7026B7] shadow-xs'
                        : 'text-[#756883] hover:text-[#24133F]'
                    }`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span>Stadium Bars</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVolumeView('wave')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      volumeView === 'wave'
                        ? 'bg-white text-[#7026B7] shadow-xs'
                        : 'text-[#756883] hover:text-[#24133F]'
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    <span>Flow Curve</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="mt-4 h-60 w-full">
              {hasAttendance ? (
                <ResponsiveContainer width="100%" height="100%">
                  {volumeView === 'bars' ? (
                    /* Stadium Bars with Background Column Track (Photo 3 & Photo 1 style) */
                    <BarChart data={volumeChartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EEF4" />
                      <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#EDE8F1' }} tick={{ fill: '#756883', fontSize: 11, fontWeight: 600 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#A59CAC', fontSize: 10 }} />
                      <Tooltip
                        cursor={{ fill: 'rgba(112, 38, 183, 0.04)', rx: 8, ry: 8 }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const inVal = Number(payload[0]?.value ?? 0);
                            const outVal = Number(payload[1]?.value ?? 0);
                            return (
                              <div className="rounded-2xl border border-[#E5E0EB] bg-white px-3.5 py-2.5 shadow-xl text-xs">
                                <p className="font-extrabold text-[#24133F]">{label}</p>
                                <div className="mt-1 flex items-center gap-3 font-semibold text-[11px]">
                                  <span className="flex items-center gap-1 text-emerald-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    In: <strong className="font-bold text-slate-800">{inVal}</strong>
                                  </span>
                                  <span className="flex items-center gap-1 text-rose-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                    Out: <strong className="font-bold text-slate-800">{outVal}</strong>
                                  </span>
                                  <span className="flex items-center gap-1 text-[#7026B7]">
                                    Total: <strong className="font-extrabold text-[#7026B7]">{inVal + outVal}</strong>
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey="timeIns"
                        name="Time-In"
                        fill="#10B981"
                        radius={[8, 8, 8, 8]}
                        background={{ fill: '#FAF8FC', radius: 8 }}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="timeOuts"
                        name="Time-Out"
                        fill="#EF4444"
                        radius={[8, 8, 8, 8]}
                        background={{ fill: '#FAF8FC', radius: 8 }}
                        maxBarSize={28}
                      />
                    </BarChart>
                  ) : (
                    /* Smooth Spline Flow Curve (Photo 4 bottom right style) */
                    <AreaChart data={volumeChartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="flowInGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="flowOutGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EEF4" />
                      <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#EDE8F1' }} tick={{ fill: '#756883', fontSize: 11, fontWeight: 600 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#A59CAC', fontSize: 10 }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const inVal = Number(payload[0]?.value ?? 0);
                            const outVal = Number(payload[1]?.value ?? 0);
                            return (
                              <div className="rounded-2xl border border-[#E5E0EB] bg-white px-3.5 py-2.5 shadow-xl text-xs">
                                <p className="font-extrabold text-[#24133F]">{label}</p>
                                <div className="mt-1 flex items-center gap-3 font-semibold text-[11px]">
                                  <span className="flex items-center gap-1 text-emerald-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    In: <strong className="font-bold text-slate-800">{inVal}</strong>
                                  </span>
                                  <span className="flex items-center gap-1 text-rose-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                    Out: <strong className="font-bold text-slate-800">{outVal}</strong>
                                  </span>
                                  <span className="flex items-center gap-1 text-[#7026B7]">
                                    Total: <strong className="font-extrabold text-[#7026B7]">{inVal + outVal}</strong>
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="timeIns"
                        name="Time-In"
                        stroke="#10B981"
                        strokeWidth={3}
                        fill="url(#flowInGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="timeOuts"
                        name="Time-Out"
                        stroke="#EF4444"
                        strokeWidth={3}
                        fill="url(#flowOutGrad)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-[#756883]">
                  No attendance scans recorded for this period yet.
                </div>
              )}
            </div>
          </div>

          {/* Sub-Metrics Footer directly copying Image 4 */}
          <div className="mt-6 pt-4 border-t border-[#EDE8F1] grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <span>✦</span> Time-In Scans
              </span>
              <p className="text-xl font-extrabold text-[#24133F]">{totalTimeIns.toLocaleString()}</p>
              <p className="text-[11px] font-semibold text-emerald-600">↑ {inPercentage}% of recorded volume</p>
            </div>

            <div className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                <span>⬡</span> Time-Out Scans
              </span>
              <p className="text-xl font-extrabold text-[#24133F]">{totalTimeOuts.toLocaleString()}</p>
              <p className="text-[11px] font-semibold text-rose-600">↓ {outPercentage}% exit rate</p>
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
              <Link
                to="/attendance"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#EDE8F1] bg-[#FAF8FC] px-3.5 py-2 text-xs font-bold text-[#7026B7] hover:bg-purple-100/50 transition-colors"
              >
                Full Scan Logs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Semi-Circle Radial Arc Gauge Card (Photo 4 top-right concentric arc & Photo 1 Saving Goal) */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#756883]">RFID Card Coverage</p>
                <h2 className="text-lg font-bold text-[#24133F]">Student Readiness</h2>
              </div>
              <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><CreditCard className="h-4 w-4" /></div>
            </div>
            <p className="text-xs text-[#756883] mt-1">Ratio of active students issued smart cards</p>

            {/* Radial Arc Gauge Component */}
            <div className="mt-4">
              <RadialSemiGauge
                percentage={cardRate}
                value={roster?.with_cards ?? 0}
                total={roster?.active ?? 0}
                label="Cards Assigned"
              />
            </div>
          </div>

          {/* Sub-Metrics Footer (Image 4 style) */}
          <div className="mt-6 pt-4 border-t border-[#EDE8F1] grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#7026B7]">
                <span>✦</span> Issued Cards
              </span>
              <p className="text-base font-extrabold text-[#24133F]">{number(roster?.with_cards)}</p>
              <p className="text-[10px] text-[#756883]">{cardRate}% operational</p>
            </div>
            <div className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#F59E0B]">
                <span>⬡</span> Pending Cards
              </span>
              <p className="text-base font-extrabold text-[#24133F]">
                {number((roster?.active ?? 0) - (roster?.with_cards ?? 0))}
              </p>
              <p className="text-[10px] text-[#756883]">{100 - cardRate}% unassigned</p>
            </div>
          </div>
        </div>
      </section>

      {/* Row 2: Students by Course Donut (Photo 3 / Photo 2) + Activity Heatmap Matrix Grid (Photo 4 top-right card!) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Course Distribution Donut with Image 4 Bottom List */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#756883]">Enrollment Distribution</p>
                <h2 className="text-lg font-bold text-[#24133F]">Students by Course</h2>
              </div>
              <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><GraduationCap className="h-4 w-4" /></div>
            </div>

            {/* Segmented Donut Chart */}
            <div className="relative mt-4 h-48 w-full flex items-center justify-center">
              {/* Center Summary Label (Rendered behind the tooltip via z-0) */}
              <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-[#24133F]">{number(totalCourseStudents)}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#756883]">Enrolled</span>
              </div>

              <div className="relative z-10 h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={courseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {courseData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COURSE_COLORS[index % COURSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{ zIndex: 100 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          return (
                            <div className="rounded-2xl border border-[#E5E0EB] bg-white px-3.5 py-2 text-xs shadow-xl min-w-[140px]">
                              <p className="font-bold text-[#24133F]">{data.name}</p>
                              <p className="mt-0.5 text-[11px] font-semibold text-[#7026B7]">
                                {Number(data.value).toLocaleString()} students
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Course Breakdown List directly copying Image 4's bottom list of items */}
          <div className="mt-4 space-y-2 pt-3 border-t border-[#EDE8F1]">
            {courseData.slice(0, 4).map((c, idx) => {
              const pct = totalCourseStudents ? Math.round((c.count / totalCourseStudents) * 100) : 0;
              return (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-[#24133F] truncate max-w-[170px]">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COURSE_COLORS[idx % COURSE_COLORS.length] }} />
                      {c.name}
                    </span>
                    <span className="font-bold text-[#756883] tabular-nums">{c.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#FAF8FC]">
                    <div
                      style={{ width: `${Math.max(5, pct)}%`, backgroundColor: COURSE_COLORS[idx % COURSE_COLORS.length] }}
                      className="h-1.5 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scan Activity Heatmap Matrix Grid (Photo 4 top-right card exact replica!) */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7] shrink-0 mt-0.5">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#756883]">Congestion Matrix</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h2 className="text-xl font-black text-[#24133F]">Peak Tap Hours Heatmap</h2>
                    {peakHourItem && peakHourItem.total > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200/80 px-2.5 py-0.5 text-[11px] font-bold text-[#7026B7]">
                        <Flame className="h-3 w-3 text-[#7026B7]" />
                        Rush Peak: {peakHourItem.hour} ({peakHourItem.total} scans)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#756883] mt-1">
                    Checkpoint scan density across operating hours (7:00 AM – 6:00 PM)
                  </p>
                </div>
              </div>

              {/* View Switcher: Matrix Grid vs Bars */}
              <div className="flex items-center rounded-xl bg-[#FAF8FC] p-1 border border-[#EDE8F1] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setHeatmapView('grid')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    heatmapView === 'grid'
                      ? 'bg-white text-[#7026B7] shadow-xs'
                      : 'text-[#756883] hover:text-[#24133F]'
                  }`}
                >
                  Heat Tiles Grid
                </button>
                <button
                  type="button"
                  onClick={() => setHeatmapView('bars')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    heatmapView === 'bars'
                      ? 'bg-white text-[#7026B7] shadow-xs'
                      : 'text-[#756883] hover:text-[#24133F]'
                  }`}
                >
                  Rush Bars
                </button>
              </div>
            </div>

            {/* Heatmap Matrix Grid (Directly replicating Photo 4 top-right matrix) */}
            {heatmapView === 'grid' ? (
              <div className="mt-5">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {hourlyData.map((item) => {
                    const theme = getHeatTileColor(item.total);
                    return (
                      <div
                        key={item.hour}
                        className={`group relative rounded-2xl border ${theme.border} ${theme.bg} p-3 text-center transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer`}
                      >
                        <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${theme.text} opacity-80`}>
                          {item.hour}
                        </span>
                        <span className={`block mt-1 text-2xl font-black ${theme.text}`}>
                          {item.total}
                        </span>
                        <span className={`block text-[9px] font-semibold ${theme.text} opacity-75 mt-0.5 truncate`}>
                          {item.total === 0 ? 'Clear' : `${item.inScans} in · ${item.outScans} out`}
                        </span>

                        {/* Hover Light Mode Tooltip */}
                        <div className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 z-50 hidden group-hover:block whitespace-nowrap">
                          <div className="rounded-xl border border-[#E5E0EB] bg-white px-3 py-1.5 text-xs shadow-xl text-left">
                            <p className="font-extrabold text-[#24133F]">{item.hour}</p>
                            <p className="text-[11px] text-emerald-600 font-semibold">Time-In: {item.inScans}</p>
                            <p className="text-[11px] text-rose-600 font-semibold">Time-Out: {item.outScans}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Heat Bar Chart View */
              <div className="mt-5 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EEF4" />
                    <XAxis dataKey="hour" tickLine={false} axisLine={{ stroke: '#EDE8F1' }} tick={{ fill: '#756883', fontSize: 10, fontWeight: 600 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#A59CAC', fontSize: 10 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(112, 38, 183, 0.04)', rx: 8, ry: 8 }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0]?.payload as { hour: string; inScans: number; outScans: number; total: number };
                          return (
                            <div className="rounded-2xl border border-[#E5E0EB] bg-white px-3.5 py-2.5 shadow-xl text-xs">
                              <p className="font-extrabold text-[#24133F]">{label}</p>
                              <div className="mt-1.5 space-y-1 text-[11px]">
                                <div className="flex items-center justify-between gap-3 text-emerald-600 font-medium">
                                  <span>Time-In:</span>
                                  <span className="font-bold text-slate-800">{item.inScans}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-rose-600 font-medium">
                                  <span>Time-Out:</span>
                                  <span className="font-bold text-slate-800">{item.outScans}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-[#7026B7] font-bold pt-1 border-t border-[#EDE8F1]">
                                  <span>Total:</span>
                                  <span>{item.total} scans</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="total" radius={[8, 8, 8, 8]} background={{ fill: '#FAF8FC', radius: 8 }} maxBarSize={28}>
                      {hourlyData.map((entry, index) => {
                        const ratio = entry.total / peakHourlyScan;
                        const fill = entry.total === 0
                          ? '#EDE8F1'
                          : ratio > 0.65
                          ? '#7026B7'
                          : ratio > 0.4
                          ? '#FDBA74'
                          : ratio > 0.18
                          ? '#FEF08A'
                          : '#86EFAC';
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Sub-Metrics Footer directly copying Image 4 */}
          <div className="mt-6 pt-4 border-t border-[#EDE8F1] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="flex items-center gap-1.5 font-bold text-[#7026B7]">
                  <span>✦</span> Morning Rush
                </span>
                <p className="text-sm font-extrabold text-[#24133F] mt-0.5">8:00 AM – 9:30 AM</p>
                <p className="text-[10px] text-[#756883]">Main entrance entry rush</p>
              </div>

              <div>
                <span className="flex items-center gap-1.5 font-bold text-[#F59E0B]">
                  <span>⬡</span> Afternoon Rush
                </span>
                <p className="text-sm font-extrabold text-[#24133F] mt-0.5">1:00 PM – 2:30 PM</p>
                <p className="text-[10px] text-[#756883]">Post-lunch session influx</p>
              </div>
            </div>

            {/* Heat Color Spectrum Legend */}
            <div className="flex items-center gap-2.5 text-[11px] font-semibold text-[#756883]">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-md bg-[#D1FAE5] border border-[#A7F3D0]" /> Low
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-md bg-[#FEF08A] border border-[#FDE047]" /> Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-md bg-[#FDBA74] border border-[#FB923C]" /> Busy
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-md bg-[#7026B7]" /> Peak Rush
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Row 3: Checkpoint Activity (Styled like Image 4 item breakdown lists) */}
      <section className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#756883]">Station Health</p>
            <h2 className="text-lg font-bold text-[#24133F]">Checkpoint Distribution</h2>
          </div>
          <Link to="/locations" className="text-xs font-bold text-[#7026B7] hover:underline flex items-center gap-1">
            Manage Stations <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-xs text-[#756883] mt-0.5">Daily recorded scans across RFID hardware stations</p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {hasCheckpointActivity ? (
            locations.map((loc, idx) => {
              const pct = Math.round((loc.scansToday / locationPeak) * 100);
              return (
                <div key={loc.id} className="rounded-2xl border border-[#EDE8F1] bg-[#FAF8FC] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#24133F] truncate max-w-[140px]">{loc.name}</span>
                    <span className="text-[11px] font-extrabold text-[#7026B7] bg-purple-100/60 px-2 py-0.5 rounded-md">
                      #{idx + 1}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-[#24133F]">{loc.scansToday.toLocaleString()} <span className="text-xs font-normal text-[#756883]">scans</span></p>
                  <div className="h-1.5 w-full rounded-full bg-white">
                    <div
                      style={{ width: `${Math.max(6, pct)}%` }}
                      className="h-1.5 rounded-full bg-[#7026B7] transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="col-span-full py-6 text-center text-xs text-[#756883]">No scan activity at checkpoints today.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default OverviewPage;
