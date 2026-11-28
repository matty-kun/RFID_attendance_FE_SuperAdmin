import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, CreditCard, History, MapPin, ScanLine, Users } from 'lucide-react';
import { adminService } from '../services/adminService';
import { studentService } from '../features/students/services/studentService';
import { useAcademicTerm } from '../context/AcademicTermContext';
import { request } from '../services/apiClient';
import { toast } from '../context';
import type { StudentRosterStats } from '../features/students/models';
import type { AcademicTerm, DashboardMetrics, EventRecord } from '../types';
import hawiPeeking from '../assets/illustrations/Hawi Peeking.png';
// TEMP: Scan-to-Confirmation Time Tracking (Testing Only — remove before production)
import { ScanTimingTestPanel } from '../components/testing/ScanTimingTestPanel';
import { cn } from '../utils/cn';

type LiveOverviewData = {
  mode: 'live';
  metrics: DashboardMetrics;
  roster: StudentRosterStats;
  event: EventRecord | null;
};

type HistoricalOverviewData = {
  mode: 'historical';
  term: AcademicTerm;
  events: EventRecord[];
  totalScans: number;
  trend: Array<{ day: string; timeIns: number; timeOuts: number }>;
  checkpoints: Array<{ name: string; total: number }>;
  roster: StudentRosterStats;
};

type OverviewData = LiveOverviewData | HistoricalOverviewData;

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

const isEventInTerm = (event: EventRecord, term?: AcademicTerm | null): boolean => {
  if (!term?.start_date || !term?.end_date) return true;
  const termStart = term.start_date.substring(0, 10);
  const termEnd = term.end_date.substring(0, 10);
  const eventStart = (event.start_date || '').substring(0, 10);
  const eventEnd = (event.end_date || event.start_date || '').substring(0, 10);
  if (!eventStart) return false;
  return eventStart <= termEnd && eventEnd >= termStart;
};

const formatTermRange = (term?: AcademicTerm | null) => {
  if (!term?.start_date || !term?.end_date) return '';
  const fmt = (d: string) =>
    new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila',
    }).format(new Date(`${d.substring(0, 10)}T00:00:00+08:00`));
  return `${fmt(term.start_date)} – ${fmt(term.end_date)}`;
};

export function OverviewPage() {
  const { terms, selectedTerm, setSelectedTerm, activeTerm } = useAcademicTerm();
  const currentTerm = selectedTerm || activeTerm || terms[0];
  const isViewingActive = Boolean(activeTerm && currentTerm ? currentTerm.id === activeTerm.id : true);

  const [data, setData] = useState<OverviewData | null>(null);
  const [, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (isViewingActive || !currentTerm) {
        // Mode 1: Live Today Operations
        const [metrics, roster, active] = await Promise.all([
          adminService.getMetrics(),
          studentService.getRosterStats(),
          adminService.getActiveEvent(),
        ]);
        setData({ mode: 'live', metrics, roster, event: active.event });
      } else {
        // Mode 2: Historical Term Archive
        const [reportRes, allEvents, roster] = await Promise.all([
          request.get<any>('/reports', {
            params: {
              termId: currentTerm.id,
              startDate: currentTerm.start_date ? currentTerm.start_date.substring(0, 10) : undefined,
              endDate: currentTerm.end_date ? currentTerm.end_date.substring(0, 10) : undefined,
              limit: 1,
            },
          }),
          adminService.getEvents().catch(() => [] as EventRecord[]),
          studentService.getRosterStats().catch(() => ({ total: 0, active: 0, archived: 0, with_cards: 0, without_cards: 0 })),
        ]);

        const eventsInTerm = (allEvents || []).filter((e) => isEventInTerm(e, currentTerm));
        const trend = Array.isArray(reportRes?.trend) ? reportRes.trend : [];
        const rawCheckpoints = Array.isArray(reportRes?.checkpoints) ? reportRes.checkpoints : [];
        const checkpoints = rawCheckpoints
          .map((c: any) => ({
            name: c.name || 'Checkpoint',
            total: c.total ?? (c.inScans ?? 0) + (c.outScans ?? 0),
          }))
          .sort((a: any, b: any) => b.total - a.total);

        setData({
          mode: 'historical',
          term: currentTerm,
          events: eventsInTerm,
          totalScans: reportRes?.summary?.totalScans ?? 0,
          trend,
          checkpoints,
          roster,
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Could not load overview data. Showing cached view.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isViewingActive, currentTerm]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Derived metrics and chart inputs depending on mode
  const isHistorical = data?.mode === 'historical';
  const days = isHistorical
    ? (data?.trend || []).map((t) => ({ date: t.day, timeIns: t.timeIns, timeOuts: t.timeOuts }))
    : data?.metrics.attendanceByDay ?? [];

  const locations = isHistorical
    ? (data?.checkpoints || []).map((c, i) => ({ id: String(i), name: c.name, scans: c.total }))
    : (data?.metrics.locationActivity || []).map((loc) => ({
        id: loc.id,
        name: loc.name,
        scans: loc.scansToday,
      }));

  const totalPeriodScans = isHistorical
    ? data?.totalScans ?? 0
    : days.reduce((sum, d) => sum + d.timeIns + d.timeOuts, 0);

  const maxSingleMetric = Math.max(1, ...days.map((d) => Math.max(d.timeIns, d.timeOuts)));
  const yAxisMax = Math.max(4, Math.ceil(maxSingleMetric * 1.25));
  const yAxisMid = Math.round(yAxisMax / 2);
  const hasCheckpointActivity = locations.length > 0;
  const today = !isHistorical ? days.at(-1) : undefined;
  const scansToday = today ? today.timeIns + today.timeOuts : undefined;
  const cardRate = data?.roster.active ? Math.round((data.roster.with_cards / data.roster.active) * 100) : 0;
  const hasAttendance = days.some((day) => day.timeIns + day.timeOuts > 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Banner */}
      {isHistorical ? (
        <section className="relative rounded-[28px] bg-gradient-to-r from-[#24133F] via-[#351567] to-[#451475] px-6 py-7 text-white sm:px-9 sm:py-9">
          <div className="relative z-10 max-w-[75%] sm:max-w-[70%]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-purple-200 bg-purple-900/60 border border-purple-400/40 px-2.5 py-0.5 rounded-full">
                <Calendar className="h-3 w-3 text-purple-300" />
                Semester Archive · {data.term.school_year} {data.term.semester}
              </span>
              {activeTerm && (
                <button
                  type="button"
                  onClick={() => setSelectedTerm(activeTerm)}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                >
                  <span>Return to Live Today</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-4xl">
              {data.term.semester} Overview
            </h1>
            <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-[#EEE1FA]">
              {data.events.length} {data.events.length === 1 ? 'event' : 'events'} recorded
              {formatTermRange(data.term) ? ` · ${formatTermRange(data.term)}` : ''}
            </p>
          </div>
          <div className="pointer-events-none absolute -bottom-4 -right-2 sm:-bottom-[22px] sm:-right-2.5 md:-bottom-[26px] md:-right-3 z-20">
            <img
              src={hawiPeeking}
              alt="Hawi mascot peeking"
              className="h-[195px] sm:h-[235px] md:h-[265px] w-auto object-contain drop-shadow-2xl"
            />
          </div>
        </section>
      ) : (
        <section className="relative rounded-[28px] bg-[#351567] px-6 py-7 text-white sm:px-9 sm:py-9">
          <div className="relative z-10 max-w-[70%] sm:max-w-[65%]">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Operations · Today
              </span>
              <span className="text-xs font-semibold text-[#D7B9FA] tracking-[0.05em] uppercase hidden sm:inline">
                {manilaDate()}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-4xl">Attendance today</h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#EEE1FA]">
              {data?.event?.name || 'Student scans and checkpoint activity'}
            </p>
          </div>
          <div className="pointer-events-none absolute -bottom-4 -right-2 sm:-bottom-[22px] sm:-right-2.5 md:-bottom-[26px] md:-right-3 z-20">
            <img
              src={hawiPeeking}
              alt="Hawi mascot peeking"
              className="h-[195px] sm:h-[235px] md:h-[265px] w-auto object-contain drop-shadow-2xl"
            />
          </div>
        </section>
      )}

      {/* Historical Context Callout Banner */}
      {isHistorical && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-purple-200/80 bg-[#FAF7FD] px-5 py-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#7026B7]">
              <History className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#24133F]">
                Viewing Historical Term Archive ({data.term.school_year} · {data.term.semester})
              </p>
              <p className="text-[11px] text-[#756883] mt-0.5">
                Overview metrics and charts reflect aggregate records for this academic term.
              </p>
            </div>
          </div>

          {activeTerm && (
            <button
              type="button"
              onClick={() => setSelectedTerm(activeTerm)}
              className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#7026B7] hover:bg-[#5E1E9E] transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
            >
              <span>Return to Live Today</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 4 Metric KPI Cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">
              {isHistorical ? 'Term Scans' : 'Scans today'}
            </span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]">
              <ScanLine className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">
            {number(isHistorical ? data.totalScans : scansToday)}
          </p>
          <p className="mt-1 text-[11px] text-[#A59CAC]">
            {isHistorical ? 'Total scans in semester' : 'All recorded taps today'}
          </p>
        </div>

        {/* Card 2 */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">
              {isHistorical ? 'Term Events' : 'Active students'}
            </span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]">
              {isHistorical ? <Calendar className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">
            {number(isHistorical ? data.events.length : data?.roster.active)}
          </p>
          <p className="mt-1 text-[11px] text-[#A59CAC]">
            {isHistorical ? 'Events scheduled in term' : 'Registered active students'}
          </p>
        </div>

        {/* Card 3 */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Cards assigned</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">{cardRate}%</p>
          <p className="mt-1 text-[11px] text-[#A59CAC]">Students with RFID card</p>
        </div>

        {/* Card 4 */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">
              {isHistorical ? 'Active Checkpoints' : 'Checkpoints'}
            </span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">
            {number(
              isHistorical
                ? data.checkpoints.filter((c) => c.total > 0).length
                : data?.metrics.totalLocations
            )}
          </p>
          <p className="mt-1 text-[11px] text-[#A59CAC]">
            {isHistorical ? 'Locations with activity' : 'Configured scan locations'}
          </p>
        </div>
      </section>

      {/* Main Charts Row */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Attendance Volume Chart */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#24133F]">
                  {isHistorical ? `Attendance volume (${data.term.semester})` : 'Attendance volume'}
                </h2>
                <span className="rounded-full bg-purple-50 border border-purple-200/80 px-2 py-0.5 text-[11px] font-bold text-[#7026B7]">
                  {totalPeriodScans} {totalPeriodScans === 1 ? 'scan' : 'scans'}
                </span>
              </div>
              <p className="text-xs text-[#756883] mt-0.5">
                {isHistorical
                  ? `Daily scans recorded across ${data.term.school_year} ${data.term.semester}`
                  : 'Total daily scans recorded by date'}
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

              <Link
                to={isHistorical ? '/reports' : '/attendance'}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#7026B7] hover:underline shrink-0"
              >
                {isHistorical ? 'View Reports' : 'Full logs'} <ArrowRight className="h-3 w-3" />
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
                <div className="relative z-10 flex-1 flex items-end gap-2 sm:gap-4 pb-6 overflow-x-auto [scrollbar-width:thin]">
                  {days.map((day, idx) => {
                    const inHeight =
                      day.timeIns > 0 ? Math.min(100, Math.round((day.timeIns / yAxisMax) * 100)) : 0;
                    const outHeight =
                      day.timeOuts > 0 ? Math.min(100, Math.round((day.timeOuts / yAxisMax) * 100)) : 0;
                    const total = day.timeIns + day.timeOuts;
                    const isHovered = hoveredDay === idx;
                    const isToday = !isHistorical && day.date === today?.date;

                    return (
                      <div
                        key={day.date}
                        onMouseEnter={() => setHoveredDay(idx)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`relative flex-1 min-w-[38px] flex flex-col items-center justify-end h-full rounded-xl transition-all cursor-pointer py-1 ${
                          isHovered ? 'bg-purple-50/50' : ''
                        }`}
                      >
                        {/* Floating Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-14 z-30 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                            <div className="rounded-xl bg-white border border-[#E5E0EB] px-3 py-1.5 text-center text-[#24133F] shadow-lg text-[11px] whitespace-nowrap">
                              <span className="font-extrabold text-xs text-[#24133F]">
                                {formatDay(day.date)}{' '}
                                <span className="font-semibold text-[#7026B7] text-[10px]">
                                  ({total} {total === 1 ? 'scan' : 'scans'})
                                </span>
                              </span>
                              <div className="flex items-center justify-center gap-2 mt-0.5 text-[11px]">
                                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  In: {day.timeIns}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="flex items-center gap-1 text-rose-600 font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                  Out: {day.timeOuts}
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 w-1.5 -rotate-45 bg-white border-b border-r border-[#E5E0EB] -mt-1" />
                          </div>
                        )}

                        {/* Side-by-side Pair of Bars */}
                        <div className="w-full flex justify-center items-end gap-1.5 sm:gap-2.5 h-full">
                          {/* Time In Bar (Green) */}
                          <div className="flex flex-col items-center justify-end h-full">
                            {day.timeIns > 0 ? (
                              <>
                                <span
                                  className={`text-[11px] font-bold mb-1.5 tabular-nums transition-colors ${
                                    isHovered ? 'text-emerald-700 scale-110 font-extrabold' : 'text-emerald-600'
                                  }`}
                                >
                                  {day.timeIns}
                                </span>
                                <div
                                  style={{ height: `${inHeight}%` }}
                                  className="w-4 sm:w-6 md:w-7 rounded-t-lg bg-[#10B981] shadow-xs transition-all duration-300 hover:brightness-110"
                                  title={`Time In: ${day.timeIns}`}
                                />
                              </>
                            ) : (
                              <div className="h-1.5 w-4 sm:w-6 md:w-7 rounded-full bg-slate-200" title="Time In: 0" />
                            )}
                          </div>

                          {/* Time Out Bar (Red) */}
                          <div className="flex flex-col items-center justify-end h-full">
                            {day.timeOuts > 0 ? (
                              <>
                                <span
                                  className={`text-[11px] font-bold mb-1.5 tabular-nums transition-colors ${
                                    isHovered ? 'text-rose-700 scale-110 font-extrabold' : 'text-rose-600'
                                  }`}
                                >
                                  {day.timeOuts}
                                </span>
                                <div
                                  style={{ height: `${outHeight}%` }}
                                  className="w-4 sm:w-6 md:w-7 rounded-t-lg bg-[#EF4444] shadow-xs transition-all duration-300 hover:brightness-110"
                                  title={`Time Out: ${day.timeOuts}`}
                                />
                              </>
                            ) : (
                              <div className="h-1.5 w-4 sm:w-6 md:w-7 rounded-full bg-slate-200" title="Time Out: 0" />
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
                  {isHistorical
                    ? 'No attendance scans recorded for this semester.'
                    : 'No attendance scans recorded for this period yet.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Checkpoint Activity List */}
        <div className="rounded-3xl border border-[#E5E0EB] bg-white shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#24133F]">Checkpoint activity</h2>
              <Link to="/locations" className="text-xs font-bold text-[#7026B7] hover:underline">
                Manage
              </Link>
            </div>
            <p className="text-xs text-[#756883] mt-0.5">
              {isHistorical
                ? `Distribution across scan locations in ${data.term.semester}`
                : 'Distribution across scan locations'}
            </p>
          </div>

          <div className="mt-2 space-y-1.5 max-h-[290px] overflow-y-auto px-6 pb-6 [scrollbar-width:thin]">
            {hasCheckpointActivity ? (
              locations.map((loc) => {
                const hasScans = loc.scans > 0;
                return (
                  <div
                    key={loc.id}
                    className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-[#FAF8FC] transition-colors border border-transparent hover:border-[#F1EEF4]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-3">
                      <div
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                          hasScans ? 'bg-[#F5F0FA] text-[#7026B7]' : 'bg-slate-100 text-slate-400'
                        )}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-[#24133F] truncate">{loc.name}</span>
                    </div>
                    <span
                      className={cn(
                        'text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 tabular-nums',
                        hasScans
                          ? 'bg-purple-50 text-[#7026B7] border border-purple-200/80'
                          : 'bg-slate-50 text-slate-400 border border-slate-200/60'
                      )}
                    >
                      {loc.scans} {loc.scans === 1 ? 'scan' : 'scans'}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-xs text-[#756883]">
                {isHistorical
                  ? 'No scan activity at checkpoints for this semester.'
                  : 'No scan activity at checkpoints today.'}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* TEMP: Scan-to-Confirmation Time Tracking (Testing Only — remove before production) */}
      <ScanTimingTestPanel />
    </div>
  );
}

export default OverviewPage;
