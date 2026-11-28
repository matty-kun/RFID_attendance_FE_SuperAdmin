import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Calendar, CalendarDays, Clock, GraduationCap, MapPin, Search } from 'lucide-react';
import { toast } from '../context';
import { Dropdown } from '../components/common/Dropdown';
import { ExportButton, type ExportFormat } from '../components/common/ExportButton';
import { Checkbox } from '../components/common/Checkbox';
import { Button } from '../components/common/Button';
import { request } from '../services/apiClient';
import { adminService } from '../services/adminService';
import { useAcademicTerm } from '../context/AcademicTermContext';
import type { EventRecord } from '../types';
import { formatReportSessionLabel, type ReportSessionItem, type ReportCheckpointItem, type ReportCourseItem, type ReportStudentAttendanceRow } from './auditPreviewRecords';
import { StudentProfileDrawer } from '../features/students/views/StudentProfileDrawer';
import type { StudentRecord } from '../features/students/models';

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
    yearLevel?: number | null;
    year_level?: number | null;
    event?: string;
    eventName?: string;
    event_name?: string;
    eventId?: string;
    session: string;
    day: string;
    period: string;
    timeIn: string | null;
    timeOut: string | null;
    adminOfficer?: string | null;
    scannedBy?: string | null;
    scannedByIn?: string | null;
    scannedByOut?: string | null;
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
  const { terms, selectedTerm, activeTerm } = useAcademicTerm();
  const currentTerm = selectedTerm || activeTerm || terms[0];
  const termId = currentTerm?.id || '';
  const [startDate, setStartDate] = useState(
    currentTerm?.start_date ? currentTerm.start_date.substring(0, 10) : initialStart
  );
  const [endDate, setEndDate] = useState(
    currentTerm?.end_date ? currentTerm.end_date.substring(0, 10) : initialEnd
  );
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
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<StudentRecord | null>(null);

  useEffect(() => { void adminService.getEvents().then(setEvents).catch(() => toast.error('Could not load events.')); }, []);
  useEffect(() => { const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (currentTerm?.start_date && currentTerm?.end_date) {
      setStartDate(currentTerm.start_date.substring(0, 10));
      setEndDate(currentTerm.end_date.substring(0, 10));
    }
  }, [currentTerm]);
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
  const matchedEvent = useMemo(() => events.find((e) => e.id === event), [events, event]);

  const eventDays = useMemo(() => {
    if (!matchedEvent?.start_date || !matchedEvent?.end_date) return [];
    const startStr = matchedEvent.start_date.substring(0, 10);
    const endStr = matchedEvent.end_date.substring(0, 10);
    const start = new Date(`${startStr}T00:00:00+08:00`);
    const end = new Date(`${endStr}T00:00:00+08:00`);
    const days: { value: string; label: string; date: string }[] = [];
    const curr = new Date(start);
    let dayNum = 1;
    while (curr <= end && dayNum <= 30) {
      const ymd = curr.toISOString().substring(0, 10);
      const shortDate = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(curr);
      days.push({
        value: ymd,
        label: `Day ${dayNum} (${shortDate})`,
        date: ymd,
      });
      curr.setDate(curr.getDate() + 1);
      dayNum++;
    }
    return days;
  }, [matchedEvent]);

  const selectedDayValue = useMemo(() => {
    if (!matchedEvent) return 'all';
    if (startDate && startDate === endDate) {
      const found = eventDays.find((d) => d.value === startDate);
      if (found) return found.value;
    }
    return 'all';
  }, [matchedEvent, startDate, endDate, eventDays]);

  const dayOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Days' },
      ...eventDays.map((d) => ({ value: d.value, label: d.label })),
    ];
  }, [eventDays]);

  const reportSummary = snapshot?.summary ?? emptySummary;
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const trendRows = snapshot?.trend ?? [];
  const totalTrendScans = useMemo(() => trendRows.reduce((sum, d) => sum + d.timeIns + d.timeOuts, 0), [trendRows]);
  const maxSingleTrend = useMemo(() => Math.max(1, ...trendRows.map(d => Math.max(d.timeIns, d.timeOuts))), [trendRows]);
  const yAxisMax = Math.max(4, Math.ceil(maxSingleTrend * 1.25));
  const yAxisMid = Math.round(yAxisMax / 2);
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
      yearLevel: row.yearLevel ?? row.year_level ?? null,
      event: eventName,
      session: row.session,
      day: normalizeDayLabel(row.day),
      period: row.period,
      timeIn: formatManilaTime(row.timeIn),
      timeOut: formatManilaTime(row.timeOut),
      adminOfficer: row.adminOfficer || row.scannedBy || '—',
      scannedBy: row.scannedBy || row.adminOfficer || '—',
      scannedByIn: row.scannedByIn || null,
      scannedByOut: row.scannedByOut || null,
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
      const uniqueStudents = new Set(rows.map((r) => r.name)).size;
      const timeIns = rows.filter((r) => r.timeIn && r.timeIn !== '-').length;
      const timeOuts = rows.filter((r) => r.timeOut && r.timeOut !== '-').length;
      const totalScans = timeIns + timeOuts;

      const termLabel = currentTerm
        ? `A.Y. ${currentTerm.school_year} · ${currentTerm.semester}`
        : 'All Semesters';
      const eventLabel = event === 'all' ? 'All Events' : (events.find((e) => e.id === event)?.name || event);
      const dayLabel = selectedDayValue === 'all'
        ? 'All Days'
        : (eventDays.find((d) => d.value === selectedDayValue)?.label || selectedDayValue);
      const sessionLabel = session === 'all' ? 'All Sessions' : session;
      const courseLabel = course === 'all' ? 'All Courses' : course;
      const typeLabel = type === 'all' ? 'All Types' : (type === 'time_in' ? 'Time In' : 'Time Out');
      const locationLabel = location === 'all' ? 'All Locations' : location;

      const { exportAttendance } = await import('./reportExports');
      await exportAttendance(rows, format, endDate || new Date().toISOString().slice(0, 10), {
        summary: {
          studentsCheckedIn: uniqueStudents,
          timeIns,
          timeOuts,
          totalScans,
        },
        filters: {
          academicTerm: termLabel,
          event: eventLabel,
          day: dayLabel,
          session: sessionLabel,
          course: courseLabel,
          type: typeLabel,
          location: locationLabel,
          dateRange: `${startDate || 'Start'} to ${endDate || 'End'}`,
          generatedAt: new Intl.DateTimeFormat('en-PH', {
            timeZone: 'Asia/Manila',
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date()),
        },
        sessionBreakdown,
        checkpointList,
        courseList,
      });
    } catch (err) {
      console.error('Report export failed:', err);
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

      {/* Filter Bar */}
      <div className="flex items-start justify-between gap-3 w-full">
        {/* Left: Filters that wrap together without dropping Export down alone */}
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          {/* Event Filter Dropdown (compact with max-w so long event titles truncate cleanly) */}
          <Dropdown
            className="shrink-0"
            buttonClassName="h-10 px-2.5 text-xs max-w-[190px] sm:max-w-[220px]"
            value={event}
            onChange={(value) => {
              setEvent(value);
              setSession('all');
              if (value !== 'all') {
                const matched = events.find((e) => e.id === value);
                if (matched?.start_date && matched?.end_date) {
                  setStartDate(matched.start_date.substring(0, 10));
                  setEndDate(matched.end_date.substring(0, 10));
                }
              } else {
                if (currentTerm?.start_date && currentTerm?.end_date) {
                  setStartDate(currentTerm.start_date.substring(0, 10));
                  setEndDate(currentTerm.end_date.substring(0, 10));
                } else {
                  setStartDate('');
                  setEndDate('');
                }
              }
            }}
            icon={<CalendarDays className="h-4 w-4 text-[#756883]" />}
            options={[
              { value: 'all', label: 'All Events' },
              ...events.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />

          {/* Day Filter: Only shown when an event is selected */}
          {matchedEvent && eventDays.length > 0 && (
            <Dropdown
              className="shrink-0"
              buttonClassName="h-10 px-2.5 text-xs whitespace-nowrap"
              value={selectedDayValue}
              onChange={(val) => {
                if (val === 'all') {
                  if (matchedEvent.start_date && matchedEvent.end_date) {
                    setStartDate(matchedEvent.start_date.substring(0, 10));
                    setEndDate(matchedEvent.end_date.substring(0, 10));
                  }
                } else {
                  setStartDate(val);
                  setEndDate(val);
                }
              }}
              icon={<Calendar className="h-4 w-4 text-[#756883]" />}
              options={dayOptions}
            />
          )}

          {/* Session Filter */}
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

          {/* Course Filter */}
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

          {/* Type Filter */}
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

          {/* Location Filter */}
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
        </div>

        {/* Right: Actions (permanently anchored top-right, NEVER drops below) */}
        <div className="flex items-center gap-2 shrink-0">
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
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] items-start">
        {/* Card 1: Attendance Trend */}
        <section className="flex flex-col rounded-[24px] border border-[#E5E0EB] bg-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#24133F]">Attendance Trend</h2>
                <span className="rounded-full bg-purple-50 border border-purple-200/80 px-2 py-0.5 text-[11px] font-bold text-[#7026B7]">
                  {totalTrendScans} {totalTrendScans === 1 ? 'scan' : 'scans'}
                </span>
              </div>
              <p className="text-xs text-[#756883] mt-0.5">Time In and Time Out scans by date</p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-[#756883] shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                <span className="font-bold text-emerald-700">Time-In</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                <span className="font-bold text-rose-700">Time-Out</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 flex h-52 items-center justify-center text-xs text-[#756883]">
              Loading attendance trend…
            </div>
          ) : trendRows.length === 0 ? (
            <div className="mt-6 flex h-52 items-center justify-center text-center text-xs text-[#756883]">
              No attendance records available.
            </div>
          ) : (
            <div className="mt-6 flex gap-3 h-52">
              {/* Y-Axis Scale Marks */}
              <div className="flex flex-col justify-between text-[10px] font-semibold text-[#A59CAC] pb-6 shrink-0 text-right w-6 tabular-nums">
                <span>{yAxisMax}</span>
                <span>{yAxisMid}</span>
                <span>0</span>
              </div>

              {/* Main Chart Area */}
              <div className="relative flex-1 flex flex-col justify-between overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {/* Horizontal Grid Guidelines */}
                <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between z-0">
                  <div className="w-full border-b border-dashed border-slate-100" />
                  <div className="w-full border-b border-dashed border-slate-100" />
                  <div className="w-full border-b border-slate-200" />
                </div>

                <div className="relative z-10 flex-1 flex items-end gap-1.5 sm:gap-2.5 pb-6 min-w-full">
                  {trendRows.map((item, idx) => {
                    const inHeight = item.timeIns > 0 ? Math.min(100, Math.round((item.timeIns / yAxisMax) * 100)) : 0;
                    const outHeight = item.timeOuts > 0 ? Math.min(100, Math.round((item.timeOuts / yAxisMax) * 100)) : 0;
                    const total = item.timeIns + item.timeOuts;
                    const isHovered = hoveredTrendIdx === idx;
                    const formattedDate = formatShortDate(item.day);

                    return (
                      <div
                        key={item.day}
                        onMouseEnter={() => setHoveredTrendIdx(idx)}
                        onMouseLeave={() => setHoveredTrendIdx(null)}
                        className={`relative flex-1 flex flex-col items-center justify-end h-full rounded-xl transition-all cursor-pointer py-1 ${
                          isHovered ? 'bg-purple-50/50' : ''
                        }`}
                      >
                        {/* Floating Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-14 z-30 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                            <div className="rounded-xl bg-white border border-[#E5E0EB] px-3 py-1.5 text-center text-[#24133F] shadow-lg text-[11px] whitespace-nowrap">
                              <span className="font-extrabold text-xs text-[#24133F]">
                                {formattedDate} <span className="font-semibold text-[#7026B7] text-[10px]">({total} {total === 1 ? 'scan' : 'scans'})</span>
                              </span>
                              <div className="flex items-center justify-center gap-2 mt-0.5 text-[11px]">
                                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  In: {item.timeIns}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="flex items-center gap-1 text-rose-600 font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                  Out: {item.timeOuts}
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 w-1.5 -rotate-45 bg-white border-b border-r border-[#E5E0EB] -mt-1" />
                          </div>
                        )}

                        {/* Side-by-side Pair of Bars */}
                        <div className="w-full flex justify-center items-end gap-1 sm:gap-1.5 h-full">
                          {/* Time In Bar (Green) */}
                          <div className="flex flex-col items-center justify-end h-full flex-1 max-w-[18px]">
                            {item.timeIns > 0 ? (
                              <>
                                <span className={`text-[10px] font-bold mb-1 tabular-nums transition-colors ${
                                  isHovered ? 'text-emerald-700 scale-110 font-extrabold' : 'text-emerald-600'
                                }`}>
                                  {item.timeIns}
                                </span>
                                <div
                                  style={{ height: `${inHeight}%` }}
                                  className="w-full rounded-t-lg bg-[#10B981] shadow-xs transition-all duration-300 hover:brightness-110"
                                  title={`Time In: ${item.timeIns}`}
                                />
                              </>
                            ) : (
                              <div className="h-1.5 w-full rounded-full bg-slate-200" title="Time In: 0" />
                            )}
                          </div>

                          {/* Time Out Bar (Red) */}
                          <div className="flex flex-col items-center justify-end h-full flex-1 max-w-[18px]">
                            {item.timeOuts > 0 ? (
                              <>
                                <span className={`text-[10px] font-bold mb-1 tabular-nums transition-colors ${
                                  isHovered ? 'text-rose-700 scale-110 font-extrabold' : 'text-rose-600'
                                }`}>
                                  {item.timeOuts}
                                </span>
                                <div
                                  style={{ height: `${outHeight}%` }}
                                  className="w-full rounded-t-lg bg-[#EF4444] shadow-xs transition-all duration-300 hover:brightness-110"
                                  title={`Time Out: ${item.timeOuts}`}
                                />
                              </>
                            ) : (
                              <div className="h-1.5 w-full rounded-full bg-slate-200" title="Time Out: 0" />
                            )}
                          </div>
                        </div>

                        {/* Date Label under baseline */}
                        <div className="absolute -bottom-5 flex items-center justify-center">
                          <span
                            className={`text-[10px] font-semibold whitespace-nowrap transition-colors ${
                              isHovered
                                ? 'text-slate-900 font-bold'
                                : 'text-[#756883]'
                            }`}
                          >
                            {formattedDate}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Card 2: Session Breakdown */}
        <section className="flex flex-col rounded-[24px] border border-[#E5E0EB] bg-white overflow-hidden">
          <div className="p-6 pb-2">
            <h2 className="text-lg font-bold text-[#24133F]">Session Breakdown</h2>
            <p className="text-xs text-[#756883] mt-0.5">Recorded scans by event day and session period</p>
          </div>

          <div className="max-h-[290px] overflow-y-auto overflow-x-auto [scrollbar-width:thin] pb-3">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_#F1EEF4]">
                <tr className="text-[#756883] font-medium">
                  <th className="py-2.5 pl-6 pr-3 font-medium">Event Day · Period</th>
                  <th className="py-2.5 px-3 font-medium">Time In</th>
                  <th className="py-2.5 pl-3 pr-6 font-medium">Time Out</th>
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
                      <td className="py-2.5 pl-6 pr-3 text-[#756883] font-normal">{row.name}</td>
                      <td className="py-2.5 px-3 text-[#756883]">{row.timeIns}</td>
                      <td className="py-2.5 pl-3 pr-6 text-[#756883]">{row.timeOuts}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Checkpoints and Course Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Checkpoints */}
        <section className="flex flex-col rounded-[24px] border border-[#E5E0EB] bg-white overflow-hidden">
          <div className="p-6 pb-2">
            <h2 className="text-lg font-bold text-[#24133F]">Checkpoints</h2>
            <p className="text-xs text-[#756883] mt-0.5">Scans by checkpoint location</p>
          </div>

          <div className="max-h-[290px] overflow-y-auto overflow-x-auto [scrollbar-width:thin] pb-3">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_#F1EEF4]">
                <tr className="text-[#756883] font-medium">
                  <th className="py-2.5 pl-6 pr-3 font-medium">Checkpoint</th>
                  <th className="px-3 py-2.5 font-medium">In Scans</th>
                  <th className="px-3 py-2.5 font-medium">Out Scans</th>
                  <th className="py-2.5 pl-3 pr-6 text-right font-medium">Total</th>
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
                      <td className="py-2.5 pl-6 pr-3 text-[#756883] font-normal">{row.name}</td>
                      <td className="px-3 py-2.5 text-[#756883]">{row.inScans.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-[#756883]">{row.outScans.toLocaleString()}</td>
                      <td className="py-2.5 pl-3 pr-6 text-right text-[#756883] font-medium">{row.total.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Course Breakdown */}
        <section className="flex flex-col rounded-[24px] border border-[#E5E0EB] bg-white overflow-hidden">
          <div className="p-6 pb-2">
            <h2 className="text-lg font-bold text-[#24133F]">Course Breakdown</h2>
            <p className="mt-0.5 text-xs text-[#756883]">Scan counts follow the selected filters. Active roster is the current student count per course.</p>
          </div>

          <div className="max-h-[290px] overflow-y-auto overflow-x-auto [scrollbar-width:thin] pb-3">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_#F1EEF4]">
                <tr className="text-[#756883] font-medium">
                  <th className="py-2.5 pl-6 pr-3 font-medium">Courses</th>
                  <th className="px-3 py-2.5 font-medium">Active roster</th>
                  <th className="px-3 py-2.5 font-medium">Time In</th>
                  <th className="py-2.5 pl-3 pr-6 text-right font-medium">Time Out</th>
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
                      <td className="py-2.5 pl-6 pr-3 text-[#756883] font-normal">{row.course}</td>
                      <td className="px-3 py-2.5 text-[#756883]">{row.expected}</td>
                      <td className="px-3 py-2.5 text-[#756883]">{row.timeIn}</td>
                      <td className="py-2.5 pl-3 pr-6 text-right text-[#756883]">{row.timeOut}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[#756883] font-medium">
                <th className="w-9 py-3 pr-3">
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
                <th className="px-3 py-3 font-medium whitespace-nowrap">Name</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap">Course</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap">Event &amp; Session</th>
                <th className="px-3 py-3 text-center font-medium whitespace-nowrap">Time In</th>
                <th className="px-3 py-3 text-center font-medium whitespace-nowrap">Time Out</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap">Admin Officer</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-[#F1EEF4] transition-opacity duration-150 ${isFetchingPage ? 'opacity-40 pointer-events-none' : ''}`}>
              {filteredStudents.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 pr-3">
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
                  <td className="px-3 py-3 font-medium whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedStudentForProfile({
                          id: record.id.split('::')[0],
                          name: record.name,
                          student_id: record.id.split('::')[0].substring(0, 8),
                          course: record.course,
                          year_level: 1,
                          created_at: new Date().toISOString(),
                        })
                      }
                      className="flex items-center gap-2.5 text-left cursor-pointer group"
                    >
                      <div
                        className={`w-7 h-7 rounded-full ${record.avatarBg} ${record.avatarColor} font-bold text-xs flex items-center justify-center shrink-0`}
                      >
                        {record.initials}
                      </div>
                      <span className="font-semibold text-[#24133F] text-xs group-hover:text-[#7026B7] transition-colors">
                        {record.name}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3 text-[#24133F] whitespace-nowrap">
                    {record.course || '-'}
                  </td>
                  <td className="px-3 py-3 text-[#24133F]">
                    <div className="font-semibold text-xs leading-tight">{record.event || '-'}</div>
                    <div className="text-[11px] text-[#756883] mt-0.5 leading-tight">{formatReportSessionLabel(record) || '-'}</div>
                  </td>
                  <td className="px-3 py-3 text-center text-[#24133F] whitespace-nowrap">
                    {record.timeIn || '-'}
                  </td>
                  <td className="px-3 py-3 text-center text-[#24133F] whitespace-nowrap">
                    {record.timeOut || '-'}
                  </td>
                  <td className="px-3 py-3 text-[#24133F] whitespace-nowrap">
                    {record.scannedByIn && record.scannedByOut && record.scannedByIn !== record.scannedByOut ? (
                      <div className="flex flex-col text-[11px] leading-tight">
                        <span className="text-emerald-700 font-medium">In: {record.scannedByIn}</span>
                        <span className="text-rose-700 font-medium">Out: {record.scannedByOut}</span>
                      </div>
                    ) : record.adminOfficer && record.adminOfficer !== '—' && record.adminOfficer !== '-' ? (
                      <span className="font-medium text-xs text-[#24133F]">{record.adminOfficer}</span>
                    ) : (
                      <span className="inline-block w-10 text-center text-[#756883]">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
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

      {/* Student Profile & Attendance Compliance Drawer */}
      <StudentProfileDrawer
        isOpen={Boolean(selectedStudentForProfile)}
        onClose={() => setSelectedStudentForProfile(null)}
        student={selectedStudentForProfile}
        onUnlinkCard={() => {}}
        onQuickPair={async () => ({ success: true, message: '' })}
        onOpenRapidScan={() => {}}
        initialEventId={event !== 'all' ? event : undefined}
      />
    </div>
  );
}

export default ReportsPage;
