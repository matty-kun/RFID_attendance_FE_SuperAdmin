import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Check, ChevronDown, CreditCard, MapPin, ScanLine, Sparkles, Users } from 'lucide-react';
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

export function OverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [roster, setRoster] = useState<StudentRosterStats | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleSelectEvent = async (id: string) => {
    setSelectedEventId(id);
    setIsDropdownOpen(false);
    await loadMetrics(id === 'all' ? undefined : id);
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;

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
      {/* Overview Banner with Hawi and Interactive Event Dropdown */}
      <section className="relative rounded-[28px] bg-[#351567] px-6 py-7 text-white sm:px-9 sm:py-9">
        {/* Hawi clipped background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <img
            src={hawi}
            alt="Hawi holding an RFID card"
            className="absolute bottom-0 right-1 z-0 h-[88%] w-auto max-w-[36%] object-contain object-bottom sm:right-8"
          />
        </div>

        <div className="relative z-10 max-w-[76%] sm:max-w-[72%]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D7B9FA]">
              {manilaDate()}
            </p>

            {/* Event Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/20 border border-white/25 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs backdrop-blur-md transition-all active:scale-[0.98] cursor-pointer"
                aria-expanded={isDropdownOpen}
              >
                <Calendar className="h-3.5 w-3.5 text-[#D7B9FA]" />
                <span className="max-w-[140px] sm:max-w-[200px] truncate">
                  {selectedEvent ? selectedEvent.name : 'All Events (Overview)'}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-white/80 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 rounded-2xl border border-slate-100 bg-white p-2 text-slate-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Select View / Event
                  </div>

                  {/* Overview / All events option */}
                  <button
                    type="button"
                    onClick={() => handleSelectEvent('all')}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition cursor-pointer ${
                      selectedEventId === 'all'
                        ? 'bg-purple-50 text-[#7026B7] font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                          selectedEventId === 'all'
                            ? 'bg-[#7026B7] text-white'
                            : 'bg-purple-100 text-[#7026B7]'
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="font-bold">All Events (Overview)</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          Overall attendance across all events
                        </div>
                      </div>
                    </div>
                    {selectedEventId === 'all' && (
                      <Check className="h-4 w-4 text-[#7026B7] shrink-0" />
                    )}
                  </button>

                  <div className="my-1.5 border-t border-slate-100" />

                  {/* List of events */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                    {events.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-slate-400">
                        No events found
                      </div>
                    ) : (
                      events.map((evt) => {
                        const isSelected = selectedEventId === evt.id;
                        const status = evt.status?.toLowerCase();
                        return (
                          <button
                            key={evt.id}
                            type="button"
                            onClick={() => handleSelectEvent(evt.id)}
                            className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-purple-50 text-[#7026B7]'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`truncate text-xs ${
                                    isSelected ? 'font-black text-[#7026B7]' : 'font-bold text-slate-900'
                                  }`}
                                >
                                  {evt.name}
                                </span>
                                {status && (
                                  <span
                                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize border ${
                                      status === 'ongoing'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : status === 'completed'
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}
                                  >
                                    {status}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {formatEventDates(evt.start_date, evt.end_date)}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-[#7026B7] shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Title & Subtitle based on selection */}
          <div className="mt-4">
            {selectedEvent ? (
              <>
                {selectedEvent.status && (
                  <div className="mb-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-300 border border-emerald-400/30 capitalize">
                      {selectedEvent.status}
                    </span>
                  </div>
                )}
                <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl text-white">
                  {selectedEvent.name}
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#EEE1FA]">
                  {formatEventDates(selectedEvent.start_date, selectedEvent.end_date)} · Notre Dame of Midsayap College
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl text-white">
                  Overview
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#EEE1FA]">
                  Here's your overall attendance across all events.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

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
                {selectedEvent ? `Daily scans for ${selectedEvent.name}` : 'Total daily scans recorded by date'}
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
