import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  GraduationCap,
  MapPin,
  ScanLine,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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

export function OverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [roster, setRoster] = useState<StudentRosterStats | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const [, setLoading] = useState(true);

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

  // Sort events smartly: ongoing first, then upcoming, then completed
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const order: Record<string, number> = { ongoing: 0, upcoming: 1, completed: 2, cancelled: 3 };
      const aOrder = order[a.status?.toLowerCase() || ''] ?? 4;
      const bOrder = order[b.status?.toLowerCase() || ''] ?? 4;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime();
    });
  }, [events]);

  // Slides: 0 = Overview across all events, 1..N = specific events
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

  // Slide navigation with direction tracking for smooth slide animations
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

  // Keyboard navigation with Left & Right arrows
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
  const locationPeak = Math.max(1, ...locations.map((location) => location.scansToday));
  const hasCheckpointActivity = locations.some((location) => location.scansToday > 0);
  const today = days.at(-1);
  const scansToday = today ? today.timeIns + today.timeOuts : undefined;
  const cardRate = roster?.active ? Math.round((roster.with_cards / roster.active) * 100) : 0;
  const hasAttendance = days.some((day) => day.timeIns + day.timeOuts > 0);

  // Formatted data for Recharts BarChart
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
          <p className="mt-3 text-2xl font-black text-[#24133F]">{number(scansToday)}</p>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Active students</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><Users className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">{number(roster?.active)}</p>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Cards assigned</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><CreditCard className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">{cardRate}%</p>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Checkpoints</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><MapPin className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">{locations.length}</p>
        </div>
      </section>

      {/* Row 1: Interactive Recharts Attendance Volume & Checkpoint Activity */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Attendance Volume Chart */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#24133F]">Attendance volume</h2>
                <span className="rounded-full bg-purple-50 border border-purple-200/80 px-2 py-0.5 text-[11px] font-bold text-[#7026B7]">
                  {totalPeriodScans} {totalPeriodScans === 1 ? 'scan' : 'scans'}
                </span>
              </div>
              <p className="text-xs text-[#756883] mt-0.5">
                {currentEvent ? `Daily scans for ${currentEvent.name}` : 'Total daily scans recorded by date'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Legend: Green for Time-In, Red for Time-Out */}
              <div className="flex items-center gap-3 text-[11px] font-semibold text-[#756883]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                  <span className="font-bold text-emerald-700">Time-In</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                  <span className="font-bold text-rose-700">Time-Out</span>
                </div>
              </div>

              <Link to="/attendance" className="inline-flex items-center gap-1 text-xs font-bold text-[#7026B7] hover:underline shrink-0">
                Full logs <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Interactive Recharts Bar Chart */}
          <div className="mt-4 h-56 w-full">
            {hasAttendance ? (
              <ResponsiveContainer width="100%" height="100%">
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
                          <div className="rounded-2xl border border-[#E5E0EB] bg-white px-3.5 py-2.5 shadow-lg shadow-purple-950/5 text-xs">
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
                  <Bar dataKey="timeIns" name="Time-In" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="timeOuts" name="Time-Out" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-[#756883]">
                No attendance scans recorded for this period yet.
              </div>
            )}
          </div>
        </div>

        {/* Checkpoint Activity */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#24133F]">Checkpoint activity</h2>
            <Link to="/locations" className="text-xs font-bold text-[#7026B7] hover:underline">Manage</Link>
          </div>
          <p className="text-xs text-[#756883]">Distribution across scan locations</p>

          <div className="mt-5 space-y-3.5">
            {hasCheckpointActivity ? locations.map((loc) => {
              const pct = Math.round((loc.scansToday / locationPeak) * 100);
              return (
                <div key={loc.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#24133F]">{loc.name}</span>
                    <span className="font-bold text-[#756883]">{loc.scansToday} scans</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#FAF8FC]">
                    <div style={{ width: `${Math.max(6, pct)}%` }} className="h-2 rounded-full bg-[#7026B7] transition-all duration-500 ease-out" />
                  </div>
                </div>
              );
            }) : (
              <p className="py-8 text-center text-xs text-[#756883]">No scan activity at checkpoints today.</p>
            )}
          </div>
        </div>
      </section>

      {/* Row 2: Course Distribution Donut Chart & Peak Tap Hours Heatmap */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Attendance by Course Donut Chart */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><GraduationCap className="h-4 w-4" /></div>
            <div>
              <h2 className="text-base font-bold text-[#24133F]">Students by Course</h2>
              <p className="text-xs text-[#756883]">Enrolled student distribution</p>
            </div>
          </div>

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
                    paddingAngle={3}
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
                            <p className="mt-0.5 text-[11px] font-semibold text-[#7026B7]">{Number(data.value).toLocaleString()} students</p>
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

          {/* Course Legend Pills */}
          <div className="mt-2 flex flex-wrap gap-2 justify-center max-h-24 overflow-y-auto pr-1">
            {courseData.slice(0, 5).map((c, idx) => (
              <div key={c.name} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COURSE_COLORS[idx % COURSE_COLORS.length] }} />
                <span className="font-semibold text-slate-700 truncate max-w-[120px]">{c.name}</span>
                <span className="text-slate-400 font-bold tabular-nums">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Tap Hours (Hourly Scan Heatmap / Bar View) */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><Clock className="h-4 w-4" /></div>
              <div>
                <h2 className="text-base font-bold text-[#24133F]">Peak Tap Hours</h2>
                <p className="text-xs text-[#756883]">Checkpoint scan congestion throughout today (7 AM – 6 PM)</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-[#756883]">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-purple-200" /> Low</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#7026B7]" /> Peak Rush</span>
            </div>
          </div>

          {/* Interactive Recharts Hourly Bar / Heat Chart */}
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
                        <div className="rounded-2xl border border-[#E5E0EB] bg-white px-3.5 py-2.5 shadow-lg shadow-purple-950/5 text-xs">
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
                <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={28}>
                  {hourlyData.map((entry, index) => {
                    // Heat gradient from light purple to intense brand purple
                    const ratio = entry.total / peakHourlyScan;
                    const fill = entry.total === 0
                      ? '#EDE8F1'
                      : ratio > 0.65
                      ? '#7026B7'
                      : ratio > 0.3
                      ? '#9333EA'
                      : '#C084FC';
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

export default OverviewPage;
