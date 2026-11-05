import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MapPin,
  ScanLine,
  Users,
} from 'lucide-react';
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
  const [, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

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

  // Slide navigation
  const goToSlide = useCallback(
    (index: number) => {
      if (slides.length === 0) return;
      const safeIndex = (index + slides.length) % slides.length;
      setCurrentIndex(safeIndex);
      const slide = slides[safeIndex];
      if (slide) {
        void loadMetrics(slide.id === 'all' ? undefined : slide.id);
      }
    },
    [slides, loadMetrics]
  );

  const handlePrev = () => goToSlide(currentIndex - 1);
  const handleNext = () => goToSlide(currentIndex + 1);

  // Keyboard navigation with Left & Right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowLeft') {
        goToSlide(currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        goToSlide(currentIndex + 1);
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
  const maxSingleMetric = Math.max(1, ...days.map((d) => Math.max(d.timeIns, d.timeOuts)));
  const yAxisMax = Math.max(4, Math.ceil(maxSingleMetric * 1.25));
  const yAxisMid = Math.round(yAxisMax / 2);
  const locationPeak = Math.max(1, ...locations.map((location) => location.scansToday));
  const hasCheckpointActivity = locations.some((location) => location.scansToday > 0);
  const today = days.at(-1);
  const scansToday = today ? today.timeIns + today.timeOuts : undefined;
  const cardRate = roster?.active ? Math.round((roster.with_cards / roster.active) * 100) : 0;
  const hasAttendance = days.some((day) => day.timeIns + day.timeOuts > 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Banner Carousel with Outside Arrows and Outside Top Dots */}
      <div className="space-y-3">
        {/* Top Pagination Dots (Outside, above the banner) */}
        {slides.length > 1 && (
          <div className="flex justify-center items-center gap-2 pt-1">
            {slides.map((slide, idx) => {
              const isActive = currentIndex === idx;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
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

        {/* Banner with Outside Left & Right Arrows */}
        <div className="relative flex items-center gap-2 sm:gap-3">
          {/* Left Arrow outside the banner */}
          {slides.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="shrink-0 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white hover:bg-purple-50 active:scale-95 text-[#7026B7] border border-[#E5E0EB] shadow-xs hover:border-[#7026B7]/40 transition cursor-pointer"
              aria-label="Previous event"
              title="Previous event (←)"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          )}

          {/* Purple Banner */}
          <section className="relative flex-1 rounded-[28px] bg-[#351567] px-6 py-7 text-white sm:px-9 sm:py-9 overflow-hidden shadow-xs">
            {/* Hawi clipped background */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
              <img
                src={hawi}
                alt="Hawi holding an RFID card"
                className="absolute bottom-0 right-1 z-0 h-[88%] w-auto max-w-[36%] object-contain object-bottom sm:right-8"
              />
            </div>

            {/* Main Banner Text Area */}
            <div className="relative z-10 max-w-[76%] sm:max-w-[70%]">
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
              className="shrink-0 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white hover:bg-purple-50 active:scale-95 text-[#7026B7] border border-[#E5E0EB] shadow-xs hover:border-[#7026B7]/40 transition cursor-pointer"
              aria-label="Next event"
              title="Next event (→)"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Scans today</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><ScanLine className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">{number(scansToday)}</p>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Active students</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><Users className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">{number(roster?.active)}</p>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Cards assigned</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><CreditCard className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">{cardRate}%</p>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Checkpoints</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><MapPin className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">{locations.length}</p>
        </div>
      </section>

      {/* Attendance Volume Chart & Checkpoint Activity */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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

          <div className="mt-6 flex gap-3 h-52">
            {/* Y-Axis Scale Marks */}
            <div className="flex flex-col justify-between text-[10px] font-semibold text-[#A59CAC] pb-6 shrink-0 text-right w-6 tabular-nums">
              <span>{yAxisMax}</span>
              <span>{yAxisMid}</span>
              <span>0</span>
            </div>

            {/* Main Chart Area */}
            <div className="relative flex-1 flex flex-col justify-between">
              {/* Horizontal Grid Guidelines */}
              <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between z-0">
                <div className="w-full border-b border-dashed border-slate-100" />
                <div className="w-full border-b border-dashed border-slate-100" />
                <div className="w-full border-b border-slate-200" />
              </div>

              {hasAttendance ? (
                <div className="relative z-10 flex-1 flex items-end gap-2 sm:gap-4 pb-6">
                  {days.map((day, idx) => {
                    const inHeight = day.timeIns > 0 ? Math.min(100, Math.round((day.timeIns / yAxisMax) * 100)) : 0;
                    const outHeight = day.timeOuts > 0 ? Math.min(100, Math.round((day.timeOuts / yAxisMax) * 100)) : 0;
                    const total = day.timeIns + day.timeOuts;
                    const isHovered = hoveredDay === idx;
                    const isToday = day.date === today?.date;

                    return (
                      <div
                        key={day.date}
                        onMouseEnter={() => setHoveredDay(idx)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`relative flex-1 flex flex-col items-center justify-end h-full rounded-xl transition-all cursor-pointer py-1 ${
                          isHovered ? 'bg-purple-50/50' : ''
                        }`}
                      >
                        {/* Floating Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-14 z-30 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                            <div className="rounded-xl bg-[#24133F] px-3 py-1.5 text-center text-white shadow-xl text-[11px] whitespace-nowrap">
                              <span className="font-extrabold text-xs">
                                {formatDay(day.date)} <span className="font-normal text-purple-300 text-[10px]">({total} {total === 1 ? 'scan' : 'scans'})</span>
                              </span>
                              <div className="flex items-center justify-center gap-2 mt-0.5 text-[11px]">
                                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  In: {day.timeIns}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="flex items-center gap-1 text-rose-400 font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                                  Out: {day.timeOuts}
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 w-1.5 -rotate-45 bg-[#24133F] -mt-0.5" />
                          </div>
                        )}

                        {/* Side-by-side Pair of Bars */}
                        <div className="w-full flex justify-center items-end gap-1.5 sm:gap-2.5 h-full">
                          {/* Time In Bar (Green) */}
                          <div className="flex flex-col items-center justify-end h-full">
                            {day.timeIns > 0 ? (
                              <>
                                <span className={`text-[11px] font-bold mb-1.5 tabular-nums transition-colors ${
                                  isHovered ? 'text-emerald-700 scale-110 font-extrabold' : 'text-emerald-600'
                                }`}>
                                  {day.timeIns}
                                </span>
                                <div
                                  style={{ height: `${inHeight}%` }}
                                  className="w-5 sm:w-7 md:w-8 rounded-t-lg bg-[#10B981] shadow-xs transition-all duration-300 hover:brightness-110"
                                  title={`Time In: ${day.timeIns}`}
                                />
                              </>
                            ) : (
                              <div className="h-1.5 w-5 sm:w-7 md:w-8 rounded-full bg-slate-200" title="Time In: 0" />
                            )}
                          </div>

                          {/* Time Out Bar (Red) */}
                          <div className="flex flex-col items-center justify-end h-full">
                            {day.timeOuts > 0 ? (
                              <>
                                <span className={`text-[11px] font-bold mb-1.5 tabular-nums transition-colors ${
                                  isHovered ? 'text-rose-700 scale-110 font-extrabold' : 'text-rose-600'
                                }`}>
                                  {day.timeOuts}
                                </span>
                                <div
                                  style={{ height: `${outHeight}%` }}
                                  className="w-5 sm:w-7 md:w-8 rounded-t-lg bg-[#EF4444] shadow-xs transition-all duration-300 hover:brightness-110"
                                  title={`Time Out: ${day.timeOuts}`}
                                />
                              </>
                            ) : (
                              <div className="h-1.5 w-5 sm:w-7 md:w-8 rounded-full bg-slate-200" title="Time Out: 0" />
                            )}
                          </div>
                        </div>

                        {/* Date Label under baseline */}
                        <div className="absolute -bottom-5 flex items-center justify-center">
                          <span
                            className={`text-[10px] font-semibold whitespace-nowrap transition-colors ${
                              isToday
                                ? 'text-[#7026B7] font-bold'
                                : isHovered
                                ? 'text-slate-900 font-bold'
                                : 'text-[#756883]'
                            }`}
                          >
                            {formatDay(day.date)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-[#756883] pb-6">
                  No attendance scans recorded for this period yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#24133F]">Checkpoint activity</h2>
            <Link to="/locations" className="text-xs font-bold text-[#7026B7] hover:underline">Manage</Link>
          </div>
          <p className="text-xs text-[#756883]">Distribution across scan locations</p>

          <div className="mt-5 space-y-3">
            {hasCheckpointActivity ? locations.map((loc) => {
              const pct = Math.round((loc.scansToday / locationPeak) * 100);
              return (
                <div key={loc.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#24133F]">{loc.name}</span>
                    <span className="font-bold text-[#756883]">{loc.scansToday}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#FAF8FC]">
                    <div style={{ width: `${Math.max(6, pct)}%` }} className="h-2 rounded-full bg-[#7026B7]" />
                  </div>
                </div>
              );
            }) : (
              <p className="py-8 text-center text-xs text-[#756883]">No scan activity at checkpoints today.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default OverviewPage;
