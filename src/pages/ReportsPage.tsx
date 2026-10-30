import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRightLeft, Clock, GraduationCap, MapPin, Search } from 'lucide-react';
import { Dropdown } from '../components/common/Dropdown';
import { CalendarDatePicker } from '../components/common/CalendarDatePicker';
import { ExportButton, type ExportFormat } from '../components/common/ExportButton';
import { Checkbox } from '../components/common/Checkbox';
import { request } from '../services/apiClient';
import { adminService } from '../services/adminService';
import type { EventRecord } from '../types';
import type { ReportTrendDay, ReportSessionItem, ReportCheckpointItem, ReportCourseItem, ReportStudentAttendanceRow } from './auditPreviewRecords';

type Snapshot = {
  summary: { studentsCheckedIn: number; timeIns: number; timeOuts: number; totalScans: number };
  trend: { day: string; timeIns: number; timeOuts: number }[];
  sessions: { eventId: string; eventName: string; date: string; eventStartDate: string; period: string; timeIns: number; timeOuts: number }[];
  checkpoints: { name: string; inScans: number; outScans: number; total: number }[];
  courses: ReportCourseItem[];
  rows: { id: string; name: string; course: string; session: string; day: string; period: string; timeIn: string | null; timeOut: string | null; status: ReportStudentAttendanceRow['status'] }[];
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
const formatManilaTime = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' }) : '-';
const getInitials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'ST';
const initialEnd = manilaDate(new Date());
const initialStart = manilaDate(new Date(Date.now() - 6 * 86400000));
const emptySummary = { studentsCheckedIn: 0, timeIns: 0, timeOuts: 0, totalScans: 0 };

export function ReportsPage() {
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
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

  useEffect(() => { void adminService.getEvents().then(setEvents).catch(() => setError('Could not load events.')); }, []);
  useEffect(() => { const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => { setPage(1); setSelected([]); }, [startDate, endDate, event, session, course, type, location]);

  const params = useMemo(() => ({
    startDate, endDate, page, limit: pageSize,
    ...(event !== 'all' ? { eventId: event } : {}),
    ...(session !== 'all' ? { session } : {}),
    ...(course !== 'all' ? { course } : {}),
    ...(type !== 'all' ? { type } : {}),
    ...(location !== 'all' ? { location } : {}),
    ...(query ? { search: query } : {}),
  }), [startDate, endDate, page, event, session, course, type, location, query]);
  const loadReportsData = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const result = await request.get<Snapshot>('/reports', { params });
      if (id === requestId.current) { setSnapshot(result); setSelected([]); }
    } catch (err: any) {
      if (id === requestId.current) setError(err?.response?.data?.error?.message || 'Could not load report records. Try again.');
    } finally { if (id === requestId.current) setLoading(false); }
  }, [params]);
  useEffect(() => { void loadReportsData(); }, [loadReportsData]);

  const sessions = snapshot?.sessionsOptions ?? [];
  const courses = snapshot?.courseOptions ?? [];
  const locations = snapshot?.locationOptions ?? [];
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
  const filteredStudents: ReportStudentAttendanceRow[] = useMemo(() => (snapshot?.rows ?? []).map((row, index) => ({
    id: row.id, name: row.name, initials: getInitials(row.name),
    avatarBg: index % 2 ? 'bg-purple-200' : 'bg-purple-100', avatarColor: 'text-purple-800',
    course: row.course, session: row.session, day: row.day, period: row.period,
    timeIn: formatManilaTime(row.timeIn), timeOut: formatManilaTime(row.timeOut), status: row.status,
  })), [snapshot]);
  const eventLabel = event === 'all' ? 'All events' : events.find(item => item.id === event)?.name || 'Selected event';

  const handleExport = async (format: ExportFormat) => {
    try {
      const rows: ReportStudentAttendanceRow[] = [];
      if (selected.length) {
        rows.push(...filteredStudents.filter(row => selected.includes(row.id)));
      }
      const totalPages = selected.length ? 0 : Math.ceil((snapshot?.rowTotal ?? 0) / 100);
      for (let exportPage = 1; exportPage <= totalPages; exportPage++) {
        const result = await request.get<Snapshot>('/reports', { params: { ...params, page: exportPage, limit: 100 } });
        for (const row of result.rows) {
          rows.push({ id: row.id, name: row.name, initials: getInitials(row.name), avatarBg: '', avatarColor: '', course: row.course, session: row.session, day: row.day, period: row.period, timeIn: formatManilaTime(row.timeIn), timeOut: formatManilaTime(row.timeOut), status: row.status });
        }
      }
      const { exportAttendance } = await import('./reportExports');
      exportAttendance(rows, format, endDate);
    } catch { setError('Could not export the report. Try again.'); }
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
          onExport={(format) => { void handleExport(format); }}
          disabled={loading || !snapshot?.rowTotal}
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
      <div className="flex items-center justify-between text-xs text-[#756883]">
        <span>{(snapshot?.rowTotal ?? 0).toLocaleString()} records · Page {page} of {Math.max(1, Math.ceil((snapshot?.rowTotal ?? 0) / pageSize))}</span>
        <div className="flex gap-2">
          <button type="button" disabled={loading || page <= 1} onClick={() => setPage(page - 1)} className="rounded-xl border border-[#E5E0EB] px-4 py-2 disabled:opacity-40">Previous</button>
          <button type="button" disabled={loading || page * pageSize >= (snapshot?.rowTotal ?? 0)} onClick={() => setPage(page + 1)} className="rounded-xl border border-[#E5E0EB] px-4 py-2 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
