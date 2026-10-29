import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRightLeft,
  Clock,
  GraduationCap,
  MapPin,
  Search,
} from 'lucide-react';
import { Dropdown } from '../components/common/Dropdown';
import { CalendarDatePicker } from '../components/common/CalendarDatePicker';
import { ExportButton, type ExportFormat } from '../components/common/ExportButton';
import { Checkbox } from '../components/common/Checkbox';
import { attendanceService } from '../features/attendance/services/attendanceService';
import { studentService } from '../features/students/services/studentService';
import { adminService } from '../services/adminService';
import type { AttendanceRecord } from '../features/attendance/models';
import type { StudentRecord } from '../features/students/models';
import type { EventRecord, LocationRecord } from '../types';
import type {
  ReportTrendDay,
  ReportSessionItem,
  ReportCheckpointItem,
  ReportCourseItem,
  ReportStudentAttendanceRow,
} from './auditPreviewRecords';

const manilaDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};

function formatShortDate(ymd: string) {
  try {
    return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(
      new Date(`${ymd}T00:00:00+08:00`)
    );
  } catch {
    return ymd;
  }
}

function formatManilaTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    });
  } catch {
    return '-';
  }
}

function getInitials(fullName: string) {
  return (
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'ST'
  );
}

function buildSessionLabels(records: AttendanceRecord[], events: EventRecord[]) {
  const eventById = new Map(events.map((item) => [item.id, item]));
  const firstDateByEvent = new Map<string, string>();
  for (const record of records) {
    const eventId = record.session?.event_id || '';
    const date = record.session?.date;
    if (date && (!firstDateByEvent.has(eventId) || date < firstDateByEvent.get(eventId)!)) firstDateByEvent.set(eventId, date);
  }
  const labels = new Map<string, { day: string; period: string; date: string }>();
  for (const record of records) {
    if (labels.has(record.session_id)) continue;
    const date = record.session?.date || manilaDate(new Date(record.recorded_at));
    const eventId = record.session?.event_id || '';
    const firstDate = eventById.get(eventId)?.start_date?.slice(0, 10) || firstDateByEvent.get(eventId) || date;
    const dayNumber = Math.max(1, Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${firstDate}T00:00:00Z`)) / 86400000) + 1);
    const name = record.session?.name || '';
    const startHour = record.session?.time_in_start ? Number(record.session.time_in_start.slice(0, 2)) : NaN;
    const period = Number.isFinite(startHour)
      ? startHour < 12 ? 'Morning' : startHour < 18 ? 'Afternoon' : 'Evening'
      : /evening|night/i.test(name) ? 'Evening'
      : /afternoon/i.test(name) ? 'Afternoon'
      : /morning/i.test(name) ? 'Morning' : 'Unscheduled';
    labels.set(record.session_id, { day: `Day ${dayNumber}`, period, date });
  }
  return labels;
}

function pairAttendanceRows(sourceRecords: AttendanceRecord[], sessionLabels: ReturnType<typeof buildSessionLabels>): ReportStudentAttendanceRow[] {
  const pairMap = new Map<string, {
    id: string; name: string; course: string; session: string; day: string; period: string;
    timeIn: string; timeOut: string; hasIn: boolean; hasOut: boolean;
  }>();
  for (const record of sourceRecords) {
    const key = `${record.student_id}::${record.session_id}`;
    const row = pairMap.get(key) || {
      id: key,
      name: record.student?.name || record.student?.student_id || record.student_id.slice(0, 8),
      course: record.student?.course || '—',
      session: record.session?.name || record.session_id.slice(0, 8),
      day: sessionLabels.get(record.session_id)?.day || 'Day 1',
      period: sessionLabels.get(record.session_id)?.period || 'Unscheduled',
      timeIn: '-', timeOut: '-', hasIn: false, hasOut: false,
    };
    if (record.type === 'time_in' && !row.hasIn) {
      row.timeIn = formatManilaTime(record.recorded_at);
      row.hasIn = true;
    } else if (record.type === 'time_out' && !row.hasOut) {
      row.timeOut = formatManilaTime(record.recorded_at);
      row.hasOut = true;
    }
    pairMap.set(key, row);
  }
  return Array.from(pairMap.values()).map((row, index) => ({
    id: row.id,
    name: row.name,
    initials: getInitials(row.name),
    avatarBg: index % 2 === 0 ? 'bg-purple-200' : 'bg-blue-200',
    avatarColor: index % 2 === 0 ? 'text-purple-800' : 'text-blue-800',
    course: row.course,
    session: row.session,
    day: row.day,
    period: row.period,
    timeIn: row.timeIn,
    timeOut: row.timeOut,
    status: row.hasIn && row.hasOut ? 'Completed' : row.hasIn ? 'Missing Out' : 'Time Out Only',
  }));
}

const previewToday = new Date();
const initialEnd = manilaDate(previewToday);
const initialStart = manilaDate(new Date(previewToday.getTime() - 6 * 24 * 60 * 60 * 1000));

export function ReportsPage() {
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [registeredLocations, setRegisteredLocations] = useState<LocationRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reportRequestId = useRef(0);

  const [session, setSession] = useState('all');
  const [event, setEvent] = useState('all');
  const [course, setCourse] = useState('all');
  const [type, setType] = useState('all');
  const [location, setLocation] = useState('all');

  // Student Attendance Records search & selection
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const loadReportsData = useCallback(async () => {
    const requestId = ++reportRequestId.current;
    setLoading(true);
    setError('');
    try {
      const [firstAttendance, firstStudents, locRes, eventRes] = await Promise.all([
        attendanceService.getRecentAttendance(1, 'all', startDate, endDate, 100),
        studentService.getStudents(1, '', 'created_at', 'desc', 100),
        adminService.getLocations().catch(() => []),
        adminService.getEvents(),
      ]);
      const attendanceByPage = new Map([[1, firstAttendance.records]]);
      const studentsByPage = new Map([[1, firstStudents.students]]);
      const attendancePages = Math.ceil(firstAttendance.total / 100);
      const studentPages = Math.ceil(firstStudents.total / 100);
      for (let page = 2; page <= Math.max(attendancePages, studentPages); page += 4) {
        const requests: Promise<void>[] = [];
        for (let next = page; next < page + 4; next++) {
          if (next <= attendancePages) requests.push(attendanceService.getRecentAttendance(next, 'all', startDate, endDate, 100).then((result) => { attendanceByPage.set(next, result.records); }));
          if (next <= studentPages) requests.push(studentService.getStudents(next, '', 'created_at', 'desc', 100).then((result) => { studentsByPage.set(next, result.students); }));
        }
        await Promise.all(requests);
      }
      if (requestId !== reportRequestId.current) return;
      setRecords([...attendanceByPage.entries()].sort(([a], [b]) => a - b).flatMap(([, rows]) => rows));
      setStudents([...studentsByPage.entries()].sort(([a], [b]) => a - b).flatMap(([, rows]) => rows));
      setRegisteredLocations(locRes);
      setEvents(eventRes);
    } catch (err: any) {
      if (requestId === reportRequestId.current) setError(err?.response?.data?.error?.message || 'Could not load report records. Try again.');
    } finally {
      if (requestId === reportRequestId.current) setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void loadReportsData();
  }, [loadReportsData]);

  // Filter records by top-level dropdowns
  const filteredRawRecords = useMemo(() => {
    return records.filter((rec) => {
      if (event !== 'all' && rec.session?.event_id !== event) return false;
      if (session !== 'all' && (rec.session?.name || rec.session_id) !== session) return false;
      if (course !== 'all' && (rec.student?.course || 'Unspecified') !== course) return false;
      if (type !== 'all' && rec.type !== type) return false;
      if (location !== 'all' && (rec.location?.name || rec.location_id) !== location) return false;
      return true;
    });
  }, [records, event, session, course, type, location]);

  const sessions = useMemo(() => {
    return [...new Set(records.filter((r) => event === 'all' || r.session?.event_id === event).map((r) => r.session?.name).filter((n): n is string => Boolean(n)))].sort();
  }, [records, event]);

  const courses = useMemo(() => {
    const fromRecords = records.map((r) => r.student?.course).filter((c): c is string => Boolean(c));
    const fromStudents = students.map((s) => s.course).filter((c): c is string => Boolean(c));
    return [...new Set([...fromRecords, ...fromStudents])].sort();
  }, [records, students]);

  const locations = useMemo(() => {
    const fromRecords = records.map((r) => r.location?.name).filter((l): l is string => Boolean(l));
    const fromRegistered = registeredLocations.map((l) => l.name);
    return [...new Set([...fromRecords, ...fromRegistered])].sort();
  }, [records, registeredLocations]);

  // Card 1: Attendance Trend (derived from real records by date)
  const trendData: ReportTrendDay[] = useMemo(() => {
    const byDay = new Map<string, { timeIns: number; timeOuts: number }>();
    for (const r of filteredRawRecords) {
      const ymd = manilaDate(new Date(r.recorded_at));
      const existing = byDay.get(ymd) || { timeIns: 0, timeOuts: 0 };
      if (r.type === 'time_in') existing.timeIns += 1;
      else existing.timeOuts += 1;
      byDay.set(ymd, existing);
    }
    const entries = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
    const peak = Math.max(1, ...entries.map(([, v]) => v.timeIns + v.timeOuts));

    return entries.map(([ymd, counts]) => ({
      day: formatShortDate(ymd),
      present: counts.timeIns,
      absent: counts.timeOuts,
      presentPct: counts.timeIns > 0 ? Math.max(8, Math.round((counts.timeIns / (peak * 1.15)) * 100)) : 0,
      absentPct: counts.timeOuts > 0 ? Math.max(8, Math.round((counts.timeOuts / (peak * 1.15)) * 100)) : 0,
    }));
  }, [filteredRawRecords]);

  const sessionLabels = useMemo(() => buildSessionLabels(records, events), [records, events]);

  // Group all sessions on the same event day into scheduled periods.
  const sessionBreakdown: ReportSessionItem[] = useMemo(() => {
    const map = new Map<string, ReportSessionItem>();
    const eventById = new Map(events.map((item) => [item.id, item]));
    const multipleEvents = new Set(filteredRawRecords.map((record) => record.session?.event_id || '')).size > 1;
    for (const r of filteredRawRecords) {
      const label = sessionLabels.get(r.session_id);
      if (!label) continue;
      const eventId = r.session?.event_id || '';
      const eventRecord = eventById.get(eventId);
      const periodOrder = label.period === 'Morning' ? '1' : label.period === 'Afternoon' ? '2' : label.period === 'Evening' ? '3' : '4';
      const id = `${eventId}::${label.date}::${periodOrder}`;
      const eventPrefix = multipleEvents ? `${eventRecord?.name || 'Event'} · ` : '';
      const cur = map.get(id) || { id, name: `${eventPrefix}${label.day} · ${label.period}`, timeIns: 0, timeOuts: 0 };
      if (r.type === 'time_in') cur.timeIns += 1;
      else cur.timeOuts += 1;
      map.set(id, cur);
    }
    return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
  }, [filteredRawRecords, events, sessionLabels]);

  // Card 3: Checkpoints (derived from real records grouped by location)
  const checkpointList: ReportCheckpointItem[] = useMemo(() => {
    const map = new Map<string, { inScans: number; outScans: number }>();
    for (const r of filteredRawRecords) {
      const locName = r.location?.name || r.location_id.slice(0, 8);
      const cur = map.get(locName) || { inScans: 0, outScans: 0 };
      if (r.type === 'time_in') cur.inScans += 1;
      else cur.outScans += 1;
      map.set(locName, cur);
    }
    return Array.from(map.entries())
      .map(([name, counts]) => ({
        name,
        inScans: counts.inScans,
        outScans: counts.outScans,
        total: counts.inScans + counts.outScans,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRawRecords]);

  // Pair from both scan types before applying the type filter to displayed rows.
  const attendanceSourceRecords = useMemo(() => records.filter((record) => {
    if (event !== 'all' && record.session?.event_id !== event) return false;
    if (session !== 'all' && (record.session?.name || record.session_id) !== session) return false;
    if (course !== 'all' && (record.student?.course || 'Unspecified') !== course) return false;
    if (location !== 'all' && (record.location?.name || record.location_id) !== location) return false;
    return true;
  }), [records, event, session, course, location]);
  const studentRecordsList = useMemo(() => pairAttendanceRows(attendanceSourceRecords, sessionLabels), [attendanceSourceRecords, sessionLabels]);

  // Course Breakdown (computed from real records & student courses)
  const courseList: ReportCourseItem[] = useMemo(() => {
    const map = new Map<string, { expected: number; timeIn: number; timeOut: number }>();
    for (const s of students) {
      const c = s.course || 'Unspecified';
      if (course !== 'all' && c !== course) continue;
      const cur = map.get(c) || { expected: 0, timeIn: 0, timeOut: 0 };
      cur.expected += 1;
      map.set(c, cur);
    }
    for (const r of filteredRawRecords) {
      const c = r.student?.course || 'Unspecified';
      const cur = map.get(c) || { expected: 0, timeIn: 0, timeOut: 0 };
      if (r.type === 'time_in') cur.timeIn += 1;
      else cur.timeOut += 1;
      map.set(c, cur);
    }
    return Array.from(map.entries()).map(([courseName, counts]) => ({
      course: courseName,
      expected: counts.expected,
      timeIn: counts.timeIn,
      timeOut: counts.timeOut,
    }));
  }, [students, filteredRawRecords, course]);

  const reportSummary = useMemo(() => {
    const timeIns = filteredRawRecords.filter((record) => record.type === 'time_in');
    const timeOuts = filteredRawRecords.length - timeIns.length;
    return {
      studentsCheckedIn: new Set(timeIns.map((record) => record.student_id)).size,
      timeIns: timeIns.length,
      timeOuts,
      totalScans: filteredRawRecords.length,
    };
  }, [filteredRawRecords]);

  const eventLabel = event === 'all' ? 'All events' : events.find((item) => item.id === event)?.name || 'Selected event';

  // Filtered Student Records
  const filteredStudents = useMemo(() => {
    return studentRecordsList.filter((row) => {
      const matchesSearch =
        search === '' ||
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.course.toLowerCase().includes(search.toLowerCase()) ||
        row.session.toLowerCase().includes(search.toLowerCase()) ||
        row.day.toLowerCase().includes(search.toLowerCase()) ||
        row.period.toLowerCase().includes(search.toLowerCase()) ||
        row.status.toLowerCase().includes(search.toLowerCase());

      const matchesSession = session === 'all' || row.session === session;
      const matchesCourse = course === 'all' || row.course === course;
      const matchesType = type === 'all' || (type === 'time_in' ? row.timeIn !== '-' : row.timeOut !== '-');

      return matchesSearch && matchesSession && matchesCourse && matchesType;
    });
  }, [studentRecordsList, search, session, course, type]);

  const exportRows = selected.length
    ? filteredStudents.filter((row) => selected.includes(row.id))
    : filteredStudents;

  const handleExport = (format: ExportFormat) => {
    void import('./reportExports')
      .then(({ exportAttendance }) => exportAttendance(exportRows, format, endDate))
      .catch(() => setError('Could not export the report. Try again.'));
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

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button type="button" onClick={() => void loadReportsData()} className="text-xs font-bold underline">
            Retry
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <CalendarDatePicker
          startDate={startDate}
          endDate={endDate}
          onChange={(range) => {
            setStartDate(range.startDate);
            setEndDate(range.endDate);
          }}
        />

        <Dropdown
          value={event}
          onChange={(value) => { setEvent(value); setSession('all'); setSelected([]); }}
          options={[
            { value: 'all', label: 'All Events' },
            ...events.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />

        <Dropdown
          value={session}
          onChange={setSession}
          icon={<Clock className="h-4 w-4 text-[#756883]" />}
          options={[
            { value: 'all', label: 'All Sessions' },
            ...sessions.map((s) => ({ value: s, label: s })),
          ]}
        />

        <Dropdown
          value={course}
          onChange={setCourse}
          icon={<GraduationCap className="h-4 w-4 text-[#756883]" />}
          options={[
            { value: 'all', label: 'All Courses' },
            ...courses.map((c) => ({ value: c, label: c })),
          ]}
        />

        <Dropdown
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
          value={location}
          onChange={setLocation}
          icon={<MapPin className="h-4 w-4 text-[#756883]" />}
          options={[
            { value: 'all', label: 'All Locations' },
            ...locations.map((loc) => ({ value: loc, label: loc })),
          ]}
        />

        <ExportButton
          className="ml-auto"
          onExport={handleExport}
          disabled={!exportRows.length}
        />
      </div>

      <section aria-label="Attendance totals" className="rounded-[24px] border border-[#E5E0EB] bg-white px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-[#24133F]">Attendance totals</h2>
          <p className="text-xs text-[#756883]">{eventLabel} · {formatShortDate(startDate)}–{formatShortDate(endDate)}</p>
        </div>
        <div className="mt-5 grid grid-cols-2 border-t border-[#EDE8F1] pt-4 sm:grid-cols-4">
          <div className="border-r border-[#EDE8F1] py-1 pr-4">
            <p className="text-xs text-[#756883]">Students checked in</p>
            <p className="mt-1 text-2xl font-extrabold text-[#24133F]">{loading ? '—' : reportSummary.studentsCheckedIn.toLocaleString()}</p>
          </div>
          <div className="py-1 pl-4 sm:border-r sm:border-[#EDE8F1] sm:pr-4">
            <p className="text-xs text-[#756883]">Time In</p>
            <p className="mt-1 text-2xl font-extrabold text-[#16883F]">{loading ? '—' : reportSummary.timeIns.toLocaleString()}</p>
          </div>
          <div className="border-r border-t border-[#EDE8F1] py-3 pr-4 sm:border-t-0 sm:py-1 sm:pl-4">
            <p className="text-xs text-[#756883]">Time Out</p>
            <p className="mt-1 text-2xl font-extrabold text-[#C52736]">{loading ? '—' : reportSummary.timeOuts.toLocaleString()}</p>
          </div>
          <div className="border-t border-[#EDE8F1] py-3 pl-4 sm:border-t-0 sm:py-1">
            <p className="text-xs text-[#756883]">Total scans</p>
            <p className="mt-1 text-2xl font-extrabold text-[#7026B7]">{loading ? '—' : reportSummary.totalScans.toLocaleString()}</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-[#897B96]">Students checked in counts each student once. Scan totals count every recorded tap.</p>
      </section>

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
                  <div className="pointer-events-none absolute -top-8 z-10 hidden rounded-lg bg-[#24133F] px-3 py-1.5 text-[11px] font-medium text-white shadow-xl group-hover:block whitespace-nowrap">
                    {item.day}: {item.present} Time In · {item.absent} Time Out
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
          <table className="w-full min-w-[940px] text-left text-xs">
            <thead>
              <tr className="text-[#756883] font-medium">
                <th className="w-10 py-3">
                  <Checkbox
                    aria-label="Select all students"
                    checked={filteredStudents.length > 0 && selected.length === filteredStudents.length}
                    onChange={(e) => setSelected(e.target.checked ? filteredStudents.map((r) => r.id) : [])}
                  />
                </th>
                <th className="py-3 font-medium">Name</th>
                <th className="py-3 font-medium">Course</th>
                <th className="py-3 font-medium">Session</th>
                <th className="py-3 font-medium">Day</th>
                <th className="py-3 font-medium">Period</th>
                <th className="py-3 font-medium">Time In</th>
                <th className="py-3 font-medium">Time Out</th>
                <th className="py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EEF4]">
              {filteredStudents.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3">
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
                  <td className="py-3 font-medium">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full ${record.avatarBg} ${record.avatarColor} font-bold text-xs flex items-center justify-center shrink-0`}
                      >
                        {record.initials}
                      </div>
                      <span className="font-semibold text-[#24133F] text-xs">{record.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-[#24133F]">{record.course}</td>
                  <td className="py-3 text-[#24133F]">{record.session}</td>
                  <td className="py-3 text-[#24133F]">{record.day}</td>
                  <td className="py-3 text-[#24133F]">{record.period}</td>
                  <td className="py-3 text-[#24133F]">{record.timeIn}</td>
                  <td className="py-3 text-[#24133F]">{record.timeOut}</td>
                  <td className="py-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${
                        record.status === 'Completed'
                          ? 'bg-[#10B981]'
                          : record.status === 'Missing Out'
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
                : error
                ? 'Unable to load attendance records.'
                : 'No attendance records available.'}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default ReportsPage;
