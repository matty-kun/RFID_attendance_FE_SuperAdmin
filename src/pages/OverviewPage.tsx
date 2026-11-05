import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
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
  '#7026B7',
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
  '#64748B',
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

function RadialGaugeCompact({
  percentage,
  value,
  total,
}: {
  percentage: number;
  value: number;
  total: number;
}) {
  const safePct = Math.max(0, Math.min(100, percentage));
  const r = 58;
  const circumference = Math.PI * r;
  const strokeDashoffset = circumference - (safePct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-24 w-44 flex items-center justify-center">
        <svg viewBox="0 0 160 90" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#7026B7" />
            </linearGradient>
          </defs>
          <path
            d="M 20 82 A 60 60 0 0 1 140 82"
            fill="none"
            stroke="#F1EEF4"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path
            d="M 20 82 A 60 60 0 0 1 140 82"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-0.5 text-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#756883]">Coverage</span>
          <span className="text-2xl font-black text-[#24133F] tracking-tight">{safePct}%</span>
        </div>
      </div>
      <p className="mt-1 text-[11px] font-medium text-[#756883]">
        <strong className="text-[#24133F]">{value.toLocaleString()}</strong> of {total.toLocaleString()} students
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
        const msg = err?.response?.data?.error?.message || 'Could not load overview data.';
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

  const volumeChartData = useMemo(() => {
    return days.map((d) => ({
      rawDate: d.date,
      name: formatDay(d.date),
      timeIns: d.timeIns,
      timeOuts: d.timeOuts,
      total: d.timeIns + d.timeOuts,
    }));
  }, [days]);

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

  const hourlyData = useMemo(() => {
    return metrics?.hourlyActivity ?? [];
  }, [metrics]);

  const peakHourlyScan = Math.max(1, ...hourlyData.map((h) => h.total));

  const getHeatTileColor = (count: number) => {
    if (count === 0) return { bg: 'bg-[#FAF8FC]', text: 'text-[#897B96]', border: 'border-[#EDE8F1]' };
    const ratio = count / peakHourlyScan;
    if (ratio > 0.65) return { bg: 'bg-[#7026B7]', text: 'text-white', border: 'border-[#5B21B6]' };
    if (ratio > 0.4) return { bg: 'bg-[#FDBA74]', text: 'text-[#7C2D12]', border: 'border-[#FB923C]' };
    if (ratio > 0.18) return { bg: 'bg-[#FEF08A]', text: 'text-[#713F12]', border: 'border-[#FDE047]' };
    return { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', border: 'border-[#A7F3D0]' };
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Banner Carousel */}
      <div className="space-y-1">
        {slides.length > 1 && (
          <div className="flex justify-center items-center gap-1.5 pb-1">
            {slides.map((slide, idx) => {
              const isActive = currentIndex === idx;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(idx, idx >= currentIndex ? 'right' : 'left')}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'w-6 bg-[#7026B7]'
                      : 'w-1.5 bg-[#D1C7DF] hover:bg-[#7026B7]/50'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              );
            })}
          </div>
        )}

        <div className="relative pt-4 sm:pt-6 flex items-center gap-2">
          {slides.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-white hover:bg-purple-50 active:scale-95 text-[#7026B7] border border-[#E5E0EB] shadow-xs cursor-pointer z-20"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <section className="relative flex-1 rounded-[24px] bg-[#351567] px-6 py-6 text-white sm:px-8 sm:py-7 shadow-xs overflow-visible">
            <img
              src={hawi}
              alt="Hawi Mascot"
              className="pointer-events-none absolute bottom-0 right-2 sm:right-4 z-10 h-[calc(100%+28px)] sm:h-[calc(100%+38px)] w-auto max-w-[36%] object-contain object-bottom drop-shadow-md"
            />

            <div
              key={`banner-${currentIndex}`}
              className={`relative z-10 max-w-[70%] sm:max-w-[65%] ${
                direction === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'
              }`}
            >
              <div className="flex items-center gap-2">
                {!isOverview && currentEvent?.status && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize bg-white/15 text-white">
                    {currentEvent.status}
                  </span>
                )}
                <p className="text-[11px] font-semibold tracking-wider text-[#D7B9FA]">
                  {manilaDate()}
                </p>
              </div>

              <div className="mt-2 min-h-[50px]">
                <h1 className="text-xl sm:text-3xl font-extrabold text-white">
                  {currentSlide?.title}
                </h1>
                <p className="mt-1 text-xs text-[#EEE1FA] truncate max-w-md">
                  {currentSlide?.subtitle}
                </p>
              </div>
            </div>
          </section>

          {slides.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-white hover:bg-purple-50 active:scale-95 text-[#7026B7] border border-[#E5E0EB] shadow-xs cursor-pointer z-20"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Top Metric Strip - Compact, No Waste Space, No Redundant Icons */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3.5 shadow-2xs">
          <span className="text-xs font-semibold text-[#756883]">Scans today</span>
          <p className="mt-1 text-2xl font-black text-[#24133F]">{number(scansToday)}</p>
        </div>

        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3.5 shadow-2xs">
          <span className="text-xs font-semibold text-[#756883]">Active students</span>
          <p className="mt-1 text-2xl font-black text-[#24133F]">{number(roster?.active)}</p>
        </div>

        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3.5 shadow-2xs">
          <span className="text-xs font-semibold text-[#756883]">Cards assigned</span>
          <p className="mt-1 text-2xl font-black text-[#24133F]">{cardRate}%</p>
        </div>

        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3.5 shadow-2xs">
          <span className="text-xs font-semibold text-[#756883]">Checkpoints</span>
          <p className="mt-1 text-2xl font-black text-[#24133F]">{locations.length}</p>
        </div>
      </section>

      {/* Row 1: Attendance Volume + Card Coverage */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Attendance Volume Card */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-5 shadow-2xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-extrabold text-[#24133F]">Attendance Volume</h2>
                <span className="text-xs font-bold text-[#7026B7] bg-purple-50 px-2 py-0.5 rounded-md">
                  {totalPeriodScans.toLocaleString()} scans
                </span>
              </div>

              {/* View Switcher */}
              <div className="flex items-center rounded-lg bg-[#FAF8FC] p-0.5 border border-[#EDE8F1] text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setVolumeView('bars')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    volumeView === 'bars'
                      ? 'bg-white text-[#7026B7] shadow-2xs'
                      : 'text-[#756883] hover:text-[#24133F]'
                  }`}
                >
                  Bars
                </button>
                <button
                  type="button"
                  onClick={() => setVolumeView('wave')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    volumeView === 'wave'
                      ? 'bg-white text-[#7026B7] shadow-2xs'
                      : 'text-[#756883] hover:text-[#24133F]'
                  }`}
                >
                  Flow
                </button>
              </div>
            </div>

            {/* Compact Chart Height */}
            <div className="mt-3 h-44 w-full">
              {hasAttendance ? (
                <ResponsiveContainer width="100%" height="100%">
                  {volumeView === 'bars' ? (
                    <BarChart data={volumeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EEF4" />
                      <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#EDE8F1' }} tick={{ fill: '#756883', fontSize: 11, fontWeight: 600 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#A59CAC', fontSize: 10 }} />
                      <Tooltip
                        cursor={{ fill: 'rgba(112, 38, 183, 0.04)', rx: 6, ry: 6 }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const inVal = Number(payload[0]?.value ?? 0);
                            const outVal = Number(payload[1]?.value ?? 0);
                            return (
                              <div className="rounded-xl border border-[#E5E0EB] bg-white px-3 py-2 shadow-lg text-xs">
                                <p className="font-extrabold text-[#24133F]">{label}</p>
                                <div className="mt-1 flex items-center gap-3 text-[11px] font-semibold">
                                  <span className="text-emerald-600">In: {inVal}</span>
                                  <span className="text-rose-600">Out: {outVal}</span>
                                  <span className="text-[#7026B7] font-bold">Total: {inVal + outVal}</span>
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
                        radius={[6, 6, 6, 6]}
                        background={{ fill: '#FAF8FC', radius: 6 }}
                        maxBarSize={24}
                      />
                      <Bar
                        dataKey="timeOuts"
                        name="Time-Out"
                        fill="#EF4444"
                        radius={[6, 6, 6, 6]}
                        background={{ fill: '#FAF8FC', radius: 6 }}
                        maxBarSize={24}
                      />
                    </BarChart>
                  ) : (
                    <AreaChart data={volumeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                              <div className="rounded-xl border border-[#E5E0EB] bg-white px-3 py-2 shadow-lg text-xs">
                                <p className="font-extrabold text-[#24133F]">{label}</p>
                                <div className="mt-1 flex items-center gap-3 text-[11px] font-semibold">
                                  <span className="text-emerald-600">In: {inVal}</span>
                                  <span className="text-rose-600">Out: {outVal}</span>
                                  <span className="text-[#7026B7] font-bold">Total: {inVal + outVal}</span>
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
                        stroke="#10B981"
                        strokeWidth={2.5}
                        fill="url(#flowInGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="timeOuts"
                        stroke="#EF4444"
                        strokeWidth={2.5}
                        fill="url(#flowOutGrad)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-[#756883]">
                  No scans recorded.
                </div>
              )}
            </div>
          </div>

          {/* Clean minimal footer without symbols */}
          <div className="mt-3 pt-2.5 border-t border-[#EDE8F1] flex items-center justify-between text-xs">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Time In: <strong className="text-[#24133F]">{totalTimeIns.toLocaleString()}</strong> ({inPercentage}%)
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-rose-700">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Time Out: <strong className="text-[#24133F]">{totalTimeOuts.toLocaleString()}</strong> ({outPercentage}%)
              </span>
            </div>

            <Link to="/attendance" className="font-bold text-[#7026B7] hover:underline text-xs">
              View logs
            </Link>
          </div>
        </div>

        {/* Card Coverage */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#24133F]">Card Coverage</h2>
            <div className="mt-2">
              <RadialGaugeCompact
                percentage={cardRate}
                value={roster?.with_cards ?? 0}
                total={roster?.active ?? 0}
              />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EDE8F1] flex items-center justify-between text-xs">
            <span className="font-semibold text-[#7026B7]">
              Issued: <strong className="text-[#24133F]">{number(roster?.with_cards)}</strong>
            </span>
            <span className="font-semibold text-[#756883]">
              Pending: <strong className="text-[#24133F]">{number((roster?.active ?? 0) - (roster?.with_cards ?? 0))}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Row 2: Students by Course + Peak Tap Hours */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Students by Course */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#24133F]">Students by Course</h2>

            <div className="relative mt-2 h-36 w-full flex items-center justify-center">
              <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-[#24133F]">{number(totalCourseStudents)}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#756883]">Enrolled</span>
              </div>

              <div className="relative z-10 h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={courseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={62}
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
                            <div className="rounded-xl border border-[#E5E0EB] bg-white px-3 py-1.5 text-xs shadow-md">
                              <p className="font-bold text-[#24133F]">{data.name}</p>
                              <p className="font-semibold text-[#7026B7]">{Number(data.value).toLocaleString()} students</p>
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

          {/* Compact Course List */}
          <div className="mt-2 space-y-1.5 pt-2 border-t border-[#EDE8F1]">
            {courseData.slice(0, 3).map((c, idx) => {
              const pct = totalCourseStudents ? Math.round((c.count / totalCourseStudents) * 100) : 0;
              return (
                <div key={c.name} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-[#24133F] truncate max-w-[170px]">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: COURSE_COLORS[idx % COURSE_COLORS.length] }} />
                      {c.name}
                    </span>
                    <span className="font-bold text-[#756883] tabular-nums text-[11px]">{c.count} ({pct}%)</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-[#FAF8FC]">
                    <div
                      style={{ width: `${Math.max(5, pct)}%`, backgroundColor: COURSE_COLORS[idx % COURSE_COLORS.length] }}
                      className="h-1 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peak Tap Hours */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-5 shadow-2xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold text-[#24133F]">Peak Tap Hours</h2>

              <div className="flex items-center rounded-lg bg-[#FAF8FC] p-0.5 border border-[#EDE8F1] text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setHeatmapView('grid')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    heatmapView === 'grid'
                      ? 'bg-white text-[#7026B7] shadow-2xs'
                      : 'text-[#756883] hover:text-[#24133F]'
                  }`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setHeatmapView('bars')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    heatmapView === 'bars'
                      ? 'bg-white text-[#7026B7] shadow-2xs'
                      : 'text-[#756883] hover:text-[#24133F]'
                  }`}
                >
                  Bars
                </button>
              </div>
            </div>

            {/* Compact Heatmap Grid */}
            {heatmapView === 'grid' ? (
              <div className="mt-3">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {hourlyData.map((item) => {
                    const theme = getHeatTileColor(item.total);
                    return (
                      <div
                        key={item.hour}
                        className={`group relative rounded-xl border ${theme.border} ${theme.bg} py-2 px-1 text-center transition-all hover:scale-102 cursor-pointer`}
                      >
                        <span className={`block text-[9px] font-bold uppercase ${theme.text} opacity-80`}>
                          {item.hour}
                        </span>
                        <span className={`block text-lg font-black ${theme.text} leading-tight mt-0.5`}>
                          {item.total}
                        </span>

                        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 z-50 hidden group-hover:block whitespace-nowrap">
                          <div className="rounded-lg border border-[#E5E0EB] bg-white px-2.5 py-1 text-[11px] shadow-lg text-left">
                            <span className="font-bold text-[#24133F]">{item.hour}: </span>
                            <span className="text-emerald-600 font-medium">In {item.inScans}</span> · <span className="text-rose-600 font-medium">Out {item.outScans}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-3 h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EEF4" />
                    <XAxis dataKey="hour" tickLine={false} axisLine={{ stroke: '#EDE8F1' }} tick={{ fill: '#756883', fontSize: 10, fontWeight: 600 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#A59CAC', fontSize: 10 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(112, 38, 183, 0.04)', rx: 6, ry: 6 }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0]?.payload as { hour: string; inScans: number; outScans: number; total: number };
                          return (
                            <div className="rounded-xl border border-[#E5E0EB] bg-white px-3 py-1.5 shadow-md text-xs">
                              <p className="font-bold text-[#24133F]">{label}</p>
                              <p className="text-[11px] text-emerald-600">In: {item.inScans} · Out: {item.outScans}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="total" radius={[6, 6, 6, 6]} background={{ fill: '#FAF8FC', radius: 6 }} maxBarSize={24}>
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

          {/* Minimal clean legend dots */}
          <div className="mt-3 pt-2 border-t border-[#EDE8F1] flex items-center justify-end gap-3 text-[11px] font-medium text-[#756883]">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#D1FAE5]" /> Low</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#FEF08A]" /> Normal</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#FDBA74]" /> Busy</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#7026B7]" /> Peak</span>
          </div>
        </div>
      </section>

      {/* Row 3: Checkpoints */}
      {hasCheckpointActivity && (
        <section className="rounded-2xl border border-[#E5E0EB] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#24133F]">Checkpoints</h2>
            <Link to="/locations" className="text-xs font-bold text-[#7026B7] hover:underline">
              Manage
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {locations.map((loc) => {
              const pct = Math.round((loc.scansToday / locationPeak) * 100);
              return (
                <div key={loc.id} className="rounded-xl border border-[#EDE8F1] bg-[#FAF8FC] p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#24133F] truncate max-w-[130px]">{loc.name}</span>
                    <span className="font-bold text-[#7026B7] text-[11px]">{loc.scansToday}</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white">
                    <div style={{ width: `${Math.max(6, pct)}%` }} className="h-1 rounded-full bg-[#7026B7]" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default OverviewPage;
