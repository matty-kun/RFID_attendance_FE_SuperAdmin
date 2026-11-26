import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Calendar, Clock, GraduationCap, MapPin, Search } from 'lucide-react';
import { toast } from '../context';
import { Dropdown } from '../components/common/Dropdown';
import { CalendarDatePicker } from '../components/common/CalendarDatePicker';
import { ExportButton, type ExportFormat } from '../components/common/ExportButton';
import { Checkbox } from '../components/common/Checkbox';
import { Button } from '../components/common/Button';
import { request } from '../services/apiClient';
import { adminService } from '../services/adminService';
import { useAcademicTerm } from '../context/AcademicTermContext';
import type { EventRecord } from '../types';
import { formatReportSessionLabel, type ReportTrendDay, type ReportSessionItem, type ReportCheckpointItem, type ReportCourseItem, type ReportStudentAttendanceRow } from './auditPreviewRecords';

type Snapshot = {
  summary: { studentsCheckedIn: number; timeIns: number; timeOuts: number; totalScans: number };
  trend: { day: string; timeIns: number; timeOuts: number }[];
  sessions: { eventId: string; eventName: string; date: string; eventStartDate: string; period: string; timeIns: number; timeOuts: number }[];
  checkpoints: { name: string; inScans: number; outScans: number; total: number }[];
  courses: ReportCourseItem[];
  rows: {
    id: string;
    name: string;
    course: string;
    event?: string;
    eventName?: string;
    event_name?: string;
    eventId?: string;
    session: string;
    day: string;
    period: string;
    timeIn: string | null;
    timeOut: string | null;
    status: ReportStudentAttendanceRow['status'] | 'Missing Out';
  }[];
  rowTotal: number;
  sessionsOptions: string[];
  courseOptions: string[];
  locationOptions: string[];
};

const manilaDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};
const formatShortDate = (ymd: string) => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(`${ymd}T00:00:00+08:00`));
const formatManilaTime = (iso: string | null) => {
  if (!iso) return '-';
  const trimmed = iso.trim();
  const normalizedSpace = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const normalized = normalizedSpace
    .replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
    .replace(/([+-]\d{2})$/, '$1:00');
  const hasExplicitTz = /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized);
  const parsed = new Date(hasExplicitTz ? normalized : `${normalized}Z`);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  });
};
const normalizeDayLabel = (day?: string | null) => {
  if (!day) return '-';
  const match = /^Day\s+(-?\d+)$/i.exec(day.trim());
  if (!match) return day;
  return `Day ${Math.max(1, Number(match[1]))}`;
};
const getInitials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'ST';
const initialEnd = manilaDate(new Date());
const initialStart = manilaDate(new Date(Date.now() - 6 * 86400000));
const emptySummary = { studentsCheckedIn: 0, timeIns: 0, timeOuts: 0, totalScans: 0 };

export function ReportsPage() {
  const { terms, selectedTerm, setSelectedTerm, activeTerm } = useAcademicTerm();
  const [termId, setTermId] = useState<string>(selectedTerm?.id || 'all');
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [knownSessions, setKnownSessions] = useState<string[]>([]);
  const [knownCourses, setKnownCourses] = useState<string[]>([]);
  const [knownLocations, setKnownLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  const requestId = useRef(0);
  const pageCache = useRef<Map<number, Snapshot['rows']>>(new Map());
  const pendingRequests = useRef<Map<number, Promise<Snapshot>>>(new Map());
  const knownRowsMap = useRef<Map<string, ReportStudentAttendanceRow>>(new Map());
  const prevFilterKey = useRef<string>('');

  const [session, setSession] = useState('all');
  const [event, setEvent] = useState('all');
  const [course, setCourse] = useState('all');
  const [type, setType] = useState('all');
  const [location, setLocation] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => { void adminService.getEvents().then(setEvents).catch(() => toast.error('Could not load events.')); }, []);
  useEffect(() => { const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (selectedTerm) {
      setTermId(selectedTerm.id);
    }
  }, [selectedTerm]);
  useEffect(() => { setPage(1); setSelected([]); }, [startDate, endDate, termId, event, session, course, type, location]);

  const filterParams = useMemo(() => {
    const effectiveStart = startDate || '2000-01-01';
    const effectiveEnd = endDate || '2099-12-31';

    return {
      startDate: effectiveStart,
      endDate: effectiveEnd,
      limit: pageSize,
      ...(termId !== 'all' ? { termId } : {}),
      ...(event !== 'all' ? { eventId: event } : {}),
      ...(session !== 'all' ? { session } : {}),
      ...(course !== 'all' ? { course } : {}),
      ...(type !== 'all' ? { type } : {}),
      ...(location !== 'all' ? { location } : {}),
      ...(query ? { search: query } : {}),
    };
  }, [startDate, endDate, termId, event, session, course, type, location, query]);

  const filterKey = useMemo(() => JSON.stringify(filterParams), [filterParams]);

  const termOptions = useMemo(() => {
    if (terms.length > 0) {
      const distinctYears = new Set(terms.map((t) => t.school_year));
      const showYear = distinctYears.size > 1;
      return [
        { value: 'all', label: 'All Semesters' },
        ...terms.map((t) => ({
          value: t.id,
          label: showYear
            ? `${t.school_year} · ${t.semester}${t.id === activeTerm?.id ? ' (Active)' : ''}`
            : `${t.semester}${t.id === activeTerm?.id ? ' (Active)' : ''}`,
        })),
      ];
    }
    return [
      { value: 'all', label: 'All Semesters' },
      { value: '1st Sem', label: '1st Sem' },
      { value: '2nd Sem', label: '2nd Sem' },
    ];
  }, [terms, activeTerm]);

  const prefetchPage = useCallback((targetPage: number) => {
    const total = snapshot?.rowTotal ?? 0;
    if (targetPage < 1 || (targetPage - 1) * pageSize >= total) return;
    if (pageCache.current.has(targetPage) || pendingRequests.current.has(targetPage)) return;

    const promise = request.get<Snapshot>('/reports', {
      params: { ...filterParams, page: targetPage },
    }).then((res) => {
      pageCache.current.set(targetPage, res.rows);
      pendingRequests.current.delete(targetPage);
      return res;
    }).catch(() => {
      pendingRequests.current.delete(targetPage);
      return null as any;
    });

    pendingRequests.current.set(targetPage, promise);
  }, [filterParams, snapshot?.rowTotal, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage === page || newPage < 1) return;
    const maxPage = Math.max(1, Math.ceil((snapshot?.rowTotal ?? 0) / pageSize));
    if (newPage > maxPage) return;

    if (pageCache.current.has(newPage)) {
      const cachedRows = pageCache.current.get(newPage)!;
      setSnapshot((prev) => prev ? { ...prev, rows: cachedRows } : null);
      setPage(newPage);
      prefetchPage(newPage + 1);
      return;
    }

    setPage(newPage);
  }, [page, snapshot?.rowTotal, pageSize, prefetchPage]);

  const loadReportsData = useCallback(async (isFullReload = false) => {
    const id = ++requestId.current;
    if (isFullReload) {
      setLoading(true);
    } else {
      setIsFetchingPage(true);
    }

    try {
      let result: Snapshot;
      if (pendingRequests.current.has(page)) {
        result = await pendingRequests.current.get(page)!;
      } else {
        result = await request.get<Snapshot>('/reports', {
          params: { ...filterParams, page, limit: pageSize },
        });
      }

      if (id === requestId.current) {
        pageCache.current.set(page, result.rows);
        setSnapshot((prev) => {
          if (!prev || isFullReload) return result;
          return {
            ...prev,
            rows: result.rows,
            rowTotal: result.rowTotal,
          };
        });

        if (isFullReload) {
          setKnownSessions((prev) =>
            session === 'all'
              ? result.sessionsOptions ?? []
              : Array.from(new Set([...prev, ...(result.sessionsOptions ?? [])]))
          );
          setKnownCourses((prev) =>
            course === 'all'
              ? result.courseOptions ?? []
              : Array.from(new Set([...prev, ...(result.courseOptions ?? [])]))
          );
          setKnownLocations((prev) =>
            location === 'all'
              ? result.locationOptions ?? []
              : Array.from(new Set([...prev, ...(result.locationOptions ?? [])]))
          );
        }

        if (page * pageSize < result.rowTotal) {
          prefetchPage(page + 1);
        }
      }
    } catch (err: any) {
      if (id === requestId.current) {
        const msg = err?.response?.data?.error?.message || 'Could not load report records. Try again.';
        toast.error(msg);
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setIsFetchingPage(false);
      }
    }
  }, [filterParams, page, session, course, location, prefetchPage, pageSize]);

  useEffect(() => {
    const isFilterChanged = prevFilterKey.current !== filterKey;
    if (isFilterChanged) {
      prevFilterKey.current = filterKey;
      pageCache.current.clear();
      pendingRequests.current.clear();
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    if (!isFilterChanged && pageCache.current.has(page) && snapshot) {
      const cachedRows = pageCache.current.get(page)!;
      if (snapshot.rows !== cachedRows) {
        setSnapshot((prev) => prev ? { ...prev, rows: cachedRows } : null);
      }
      prefetchPage(page + 1);
      return;
    }

    void loadReportsData(isFilterChanged || !snapshot);
  }, [filterKey, page, snapshot, loadReportsData, prefetchPage]);

  const sessions = knownSessions;
  const courses = knownCourses;
  const locations = knownLocations;
  const reportSummary = snapshot?.summary ?? emptySummary;
  const trendData: ReportTrendDay[] = useMemo(() => {
    const rows = snapshot?.trend ?? [];
    const peak = Math.max(1, ...rows.map(row => row.timeIns + row.timeOuts));
    return rows.map(row => ({ day: formatShortDate(row.day), present: row.timeIns, absent: row.timeOuts,
      presentPct: row.timeIns ? Math.max(8, Math.round(row.timeIns / (peak * 1.15) * 100)) : 0,
      absentPct: row.timeOuts ? Math.max(8, Math.round(row.timeOuts / (peak * 1.15) * 100)) : 0 }));
  }, [snapshot]);
  const sessionBreakdown: ReportSessionItem[] = useMemo(() => {
    const multipleEvents = new Set((snapshot?.sessions ?? []).map(row => row.eventId)).size > 1;
    return (snapshot?.sessions ?? []).map(row => ({ id: `${row.eventId}::${row.date}::${row.period}`,
      name: `${multipleEvents ? `${row.eventName} · ` : ''}Day ${Math.max(1, Math.round((Date.parse(row.date) - Date.parse(row.eventStartDate)) / 86400000) + 1)} · ${row.period}`,
      timeIns: row.timeIns, timeOuts: row.timeOuts }));
  }, [snapshot]);
  const checkpointList: ReportCheckpointItem[] = snapshot?.checkpoints ?? [];
  const courseList: ReportCourseItem[] = snapshot?.courses ?? [];
  const eventsById = useMemo(() => new Map(events.map(item => [item.id, item.name])), [events]);
  const mapReportRow = useCallback((row: Snapshot['rows'][number], index = 0, sessionList = snapshot?.sessions ?? []): ReportStudentAttendanceRow => {
    const uniqueEvents = Array.from(new Set(sessionList.map(item => item.eventName).filter(Boolean)));
    const eventName =
      row.eventName ||
      row.event_name ||
      row.event ||
      (row.eventId ? eventsById.get(row.eventId) : undefined) ||
      (event !== 'all' ? eventsById.get(event) : undefined) ||
      (uniqueEvents.length === 1 ? uniqueEvents[0] : undefined) ||
      '-';
    return {
      id: row.id,
      name: row.name,
      initials: getInitials(row.name),
      avatarBg: index % 2 ? 'bg-purple-200' : 'bg-purple-100',
      avatarColor: 'text-purple-800',
      course: row.course,
      event: eventName,
      session: row.session,
      day: normalizeDayLabel(row.day),
      period: row.period,
      timeIn: formatManilaTime(row.timeIn),
      timeOut: formatManilaTime(row.timeOut),
      status: row.status === 'Missing Out' ? 'Time In Only' : row.status,
    };
  }, [eventsById, event, snapshot]);

  const filteredStudents: ReportStudentAttendanceRow[] = useMemo(() => {
    const rows = (snapshot?.rows ?? []).map((row, index) => mapReportRow(row, index));
    rows.forEach((r) => knownRowsMap.current.set(r.id, r));
    return rows;
  }, [snapshot?.rows, mapReportRow]);

  const handleExport = async (format: ExportFormat) => {
    try {
      const rows: ReportStudentAttendanceRow[] = [];
      if (selected.length) {
        for (const id of selected) {
          const row = knownRowsMap.current.get(id) || filteredStudents.find((r) => r.id === id);
          if (row) rows.push(row);
        }
      } else {
        const totalPages = Math.ceil((snapshot?.rowTotal ?? 0) / 100);
        for (let exportPage = 1; exportPage <= totalPages; exportPage++) {
          const result = await request.get<Snapshot>('/reports', {
            params: { ...filterParams, page: exportPage, limit: 100 },
          });
          for (const row of result.rows) {
            rows.push(mapReportRow(row, 0, result.sessions ?? []));
          }
        }
      }
      const { exportAttendance } = await import('./reportExports');
      exportAttendance(rows, format, endDate || new Date().toISOString().slice(0, 10));
    } catch {
      toast.error('Could not export the report. Try again.');
    }
  };
  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6 text-[#24133F]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold leading-tight">Reports &amp; Exports</h1>
          <p className="text-xs text-[#756883]">Attendance activity for selected dates and filters.</p>
        </div>
      </div>

      {/* Filter Bar - Strictly One Line */}
      <div className="flex items-center gap-2 w-full flex-nowrap overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Semester Filter Dropdown */}
        <Dropdown
          className="shrink-0"
          buttonClassName="h-10 px-2.5 text-xs whitespace-nowrap"
          value={termId}
          onChange={(val) => {
            if (val === 'all') {
              setTermId('all');
              return;
            }
            const matched = terms.find((item) => item.id === val || item.semester === val);
            if (matched) {
              setTermId(matched.id);
              setSelectedTerm(matched);
            } else {
              setTermId(val);
            }
          }}
          icon={<Calendar className="h-4 w-4 text-[#756883]" />}
          options={termOptions}
        />

        <CalendarDatePicker
          className="shrink-0"
          buttonClassName="h-10 px-2.5 text-xs whitespace-nowrap"
          startDate={startDate}
          endDate={endDate}
          onChange={(range) => {
            setStartDate(range.startDate);
            setEndDate(range.endDate);
          }}
        />

        <Dropdown
          className="shrink-0"
          buttonClassName="h-10 px-2.5 text-xs whitespace-nowrap"
          value={event}
          onChange={(value) => { setEvent(value); setSession('all'); }}
          options={[
            { value: 'all', label: 'All Events' },
            ...events.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />

        <Dropdown
          className="shrink-0"
          buttonClassName="h-10 px-2.5 text-xs whitespace-nowrap"
          value={session}
          onChange={setSession}
          icon={<Clock className="h-4 w-4 text-[#756883]" />}
          options={[
            { value: 'all', label: 'All Sessions' },
            ...sessions.map((s) => ({ value: s, label: s })),
          ]}
        />

        <Dropdown
          className="shrink-0"
          buttonClassName="h-10 px-2.5 text-xs whitespace-nowrap"
          value={course}
          onChange={setCourse}
          icon={<GraduationCap className="h-4 w-4 text-[#756883]" />}
          options={[
            { value: 'all', label: 'All Courses' },
            ...courses.map((c) => ({ value: c, label: c })),
          ]}
        />

        <Dropdown
          className="shrink-0"
          buttonClassName="h-10 px-2.5 text-xs whitespace-nowrap"
          value={type}
          onChange={setType}
          icon={<ArrowRightLeft className="h-4 w-4 text-[#756883]" />}
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'time_in', label: 'Time In' },
            { value: 'time_out', label: 'Time Out' },
          ]}
        />

        <Dropdown
          className="shrink-0"
          buttonClassName="h-10 px-2.5 text-xs whitespace-nowrap"
          value={location}
          onChange={setLocation}
          icon={<MapPin className="h-4 w-4 text-[#756883]" />}
          options={[
            { value: 'all', label: 'All Locations' },
            ...locations.map((loc) => ({ value: loc, label: loc })),
          ]}
        />

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="h-10 px-3 rounded-xl border border-[#E5E0EB] bg-white text-xs font-semibold text-[#756883] hover:text-[#24133F] hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
            >
              Clear ({selected.length})
            </button>
          )}
          <ExportButton
            className="shrink-0"
            label={selected.length > 0 ? `Export (${selected.length})` : 'Export'}
            onExport={(format) => { void handleExport(format); }}
            disabled={loading || !snapshot?.rowTotal}
          />
        </div>
      </div>

      {/* Attendance Totals Mini Dashboard */}
      <div
        className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#E5E0EB] bg-white sm:grid-cols-4"
        aria-label="Attendance summary"
      >
        <div className="border-r border-[#E5E0EB] px-5 py-4">
          <p className="text-xs text-[#756883]">Students checked in</p>
          <p className="mt-1 text-2xl font-extrabold text-[#24133F] tabular-nums">
            {loading ? '—' : reportSummary.studentsCheckedIn.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-[#A59AAB]">Unique attendees</p>
        </div>

        <div className="px-5 py-4 sm:border-r sm:border-[#E5E0EB]">
          <p className="text-xs text-[#756883]">Time In</p>
          <p className="mt-1 text-2xl font-extrabold text-[#16883F] tabular-nums">
            {loading ? '—' : reportSummary.timeIns.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-[#A59AAB]">Recorded entry taps</p>
        </div>

        <div className="border-r border-t border-[#E5E0EB] px-5 py-4 sm:border-t-0 sm:border-r sm:border-[#E5E0EB]">
          <p className="text-xs text-[#756883]">Time Out</p>
          <p className="mt-1 text-2xl font-extrabold text-[#C24139] tabular-nums">
            {loading ? '—' : reportSummary.timeOuts.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-[#A59AAB]">Recorded exit taps</p>
        </div>

        <div className="border-t border-[#E5E0EB] px-5 py-4 sm:border-t-0">
          <p className="text-xs text-[#756883]">Total scans</p>
          <p className="mt-1 text-2xl font-extrabold text-[#7026B7] tabular-nums">
            {loading ? '—' : reportSummary.totalScans.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-[#A59AAB]">All recorded taps</p>
        </div>
      </div>

      {/* Row 1: Attendance Trend (Card 1) & Session Breakdown (Card 2) */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Card 1: Attendance Trend */}
        <section className="flex flex-col justify-between rounded-[24px] border border-[#E5E0EB] bg-white p-6">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Attendance Trend</h2>
            <p className="text-xs text-[#756883] mt-0.5">Time In and Time Out scans per day</p>
          </div>

          {loading ? (
            <div className="my-6 flex h-52 items-center justify-center text-xs text-[#756883]">
              Loading attendance trend…
            </div>
          ) : trendData.length === 0 ? (
            <div className="my-6 flex h-52 items-center justify-center text-center text-xs text-[#756883]">
              No attendance records available.
            </div>
          ) : (
            <div className="my-6 flex h-52 items-end justify-around gap-4 px-2">
              {trendData.map((item) => (
                <div key={item.day} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute -top-8 z-10 hidden rounded-xl bg-white border border-[#E5E0EB] px-3 py-1.5 text-[11px] font-semibold text-[#24133F] shadow-lg group-hover:block whitespace-nowrap">
                    <span className="font-bold">{item.day}:</span>{' '}
                    <span className="text-emerald-600 font-bold">{item.present} Time In</span> ·{' '}
                    <span className="text-rose-600 font-bold">{item.absent} Time Out</span>
                  </div>

                  {/* Stacked Stadium Bars */}
                  <div className="flex w-12 h-44 flex-col justify-end gap-1.5">
                    {item.absentPct > 0 && (
                      <div
                        className="w-full rounded-[14px] bg-[#EF3340] transition-all duration-300"
                        style={{ height: `${item.absentPct}%` }}
                      />
                    )}
                    {item.presentPct > 0 && (
                      <div
                        className="w-full rounded-[14px] bg-[#10B981] transition-all duration-300"
                        style={{ height: `${item.presentPct}%` }}
                      />
                    )}
                  </div>

                  <span className="mt-3 text-xs font-medium text-[#756883]">{item.day}</span>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs text-[#756883] font-medium">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
              Time In
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EF3340]" />
              Time Out
            </span>
          </div>
        </section>

        {/* Card 2: Session Breakdown */}
        <section className="flex flex-col rounded-[24px] border border-[#E5E0EB] bg-white p-6">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Session Breakdown</h2>
            <p className="text-xs text-[#756883] mt-0.5">Recorded scans by event day and session period</p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-xs">
              <thead>
                <tr className="text-[#756883] font-medium">
                  <th className="py-2.5 font-medium">Event Day · Period</th>
                  <th className="py-2.5 font-medium">Time In</th>
                  <th className="py-2.5 font-medium">Time Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1EEF4]">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-xs text-[#756883]">
                      Loading session breakdown…
                    </td>
                  </tr>
                ) : sessionBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-xs text-[#756883]">
                      No attendance records available.
                    </td>
                  </tr>
                ) : (
                  sessionBreakdown.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 text-[#756883] font-normal">{row.name}</td>
                      <td className="py-2.5 text-[#756883]">{row.timeIns}</td>
                      <td className="py-2.5 text-[#756883]">{row.timeOuts}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Checkpoints and Course Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Checkpoints */}
        <section className="flex flex-col justify-between rounded-[24px] border border-[#E5E0EB] bg-white p-6">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Checkpoints</h2>
            <p className="text-xs text-[#756883] mt-0.5">Scans by checkpoint location</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[400px] text-left text-xs">
                <thead>
                  <tr className="text-[#756883] font-medium">
                    <th className="py-2.5 pr-4 font-medium">Checkpoint</th>
                    <th className="px-2 py-2.5 font-medium">In Scans</th>
                    <th className="px-2 py-2.5 font-medium">Out Scans</th>
                    <th className="py-2.5 pl-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EEF4]">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-[#756883]">
                        Loading checkpoints…
                      </td>
                    </tr>
                  ) : checkpointList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-[#756883]">
                        No attendance records available.
                      </td>
                    </tr>
                  ) : (
                    checkpointList.map((row) => (
                      <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 pr-4 text-[#756883] font-normal">{row.name}</td>
                        <td className="px-2 py-2.5 text-[#756883]">{row.inScans.toLocaleString()}</td>
                        <td className="px-2 py-2.5 text-[#756883]">{row.outScans.toLocaleString()}</td>
                        <td className="py-2.5 pl-2 text-right text-[#756883] font-medium">{row.total.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Course Breakdown */}
        <section className="flex flex-col justify-between rounded-[24px] border border-[#E5E0EB] bg-white p-6">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Course Breakdown</h2>
            <p className="mt-0.5 text-xs text-[#756883]">Scan counts follow the selected filters. Active roster is the current student count per course.</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[400px] text-left text-xs">
                <thead>
                  <tr className="text-[#756883] font-medium">
                    <th className="py-2.5 pr-4 font-medium">Courses</th>
                    <th className="px-2 py-2.5 font-medium">Active roster</th>
                    <th className="px-2 py-2.5 font-medium">Time In</th>
                    <th className="py-2.5 pl-2 text-right font-medium">Time Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EEF4]">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-[#756883]">
                        Loading courses…
                      </td>
                    </tr>
                  ) : courseList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-[#756883]">
                        No course records available.
                      </td>
                    </tr>
                  ) : (
                    courseList.map((row) => (
                      <tr key={row.course} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 pr-4 text-[#756883] font-normal">{row.course}</td>
                        <td className="px-2 py-2.5 text-[#756883]">{row.expected}</td>
                        <td className="px-2 py-2.5 text-[#756883]">{row.timeIn}</td>
                        <td className="py-2.5 pl-2 text-right text-[#756883]">{row.timeOut}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Student Attendance Records */}
      <section className="rounded-[24px] border border-[#E5E0EB] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Student Attendance Records</h2>
          </div>
          <label className="flex h-10 w-56 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500 transition-all focus-within:border-[#7026B7] focus-within:ring-4 focus-within:ring-purple-100 md:w-64">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="sr-only">Search attendance records</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead>
              <tr className="text-[#756883] font-medium">
                <th className="w-10 py-3.5 pr-4">
                  <Checkbox
                    aria-label="Select all students on page"
                    checked={filteredStudents.length > 0 && filteredStudents.every((r) => selected.includes(r.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const pageIds = filteredStudents.map((r) => r.id);
                        setSelected((prev) => Array.from(new Set([...prev, ...pageIds])));
                      } else {
                        const pageIdSet = new Set(filteredStudents.map((r) => r.id));
                        setSelected((prev) => prev.filter((id) => !pageIdSet.has(id)));
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap">Name</th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap">Course</th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap">Event</th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap">Session</th>
                <th className="px-4 py-3.5 text-center font-medium whitespace-nowrap">Time In</th>
                <th className="px-4 py-3.5 text-center font-medium whitespace-nowrap">Time Out</th>
                <th className="px-4 py-3.5 font-medium whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-[#F1EEF4] transition-opacity duration-150 ${isFetchingPage ? 'opacity-40 pointer-events-none' : ''}`}>
              {filteredStudents.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 pr-4">
                    <Checkbox
                      aria-label={`Select ${record.name}`}
                      checked={selected.includes(record.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked ? [...prev, record.id] : prev.filter((id) => id !== record.id)
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3.5 font-medium whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full ${record.avatarBg} ${record.avatarColor} font-bold text-xs flex items-center justify-center shrink-0`}
                      >
                        {record.initials}
                      </div>
                      <span className="font-semibold text-[#24133F] text-xs">{record.name}</span>
                    </div>
                  </td>
                  {[record.course, record.event, formatReportSessionLabel(record), record.timeIn, record.timeOut].map((value, colIndex) => {
                    const displayValue = value || '-';
                    const isCenteredColumn = colIndex >= 3;
                    return (
                      <td
                        key={colIndex}
                        className={`px-4 py-3.5 text-[#24133F] whitespace-nowrap ${isCenteredColumn ? 'text-center' : ''}`}
                      >
                        {!isCenteredColumn && displayValue === '-' ? (
                          <span className="inline-block w-10 text-center">-</span>
                        ) : (
                          displayValue
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${
                        record.status === 'Completed'
                          ? 'bg-[#10B981]'
                          : record.status === 'Time In Only'
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#EF4444]'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filteredStudents.length && (
            <p className="py-10 text-center text-xs text-[#756883]">
              {loading
                ? 'Loading attendance records…'
                : 'No attendance records available.'}
            </p>
          )}
        </div>
      </section>
      <div className="flex items-center justify-between text-xs text-[#756883]">
        <span>
          {(snapshot?.rowTotal ?? 0).toLocaleString()} records · Page {page} of {Math.max(1, Math.ceil((snapshot?.rowTotal ?? 0) / pageSize))}
          {isFetchingPage && <span className="ml-2 inline-flex items-center text-[#7026B7] font-medium animate-pulse">Loading page…</span>}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading || isFetchingPage || page <= 1}
            onMouseEnter={() => prefetchPage(page - 1)}
            onClick={() => handlePageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading || isFetchingPage || page * pageSize >= (snapshot?.rowTotal ?? 0)}
            onMouseEnter={() => prefetchPage(page + 1)}
            onClick={() => handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
