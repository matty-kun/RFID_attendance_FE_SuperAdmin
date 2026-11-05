import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Clock, GraduationCap, MapPin, Search } from 'lucide-react';
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
import { Dropdown } from '../components/common/Dropdown';
import { CalendarDatePicker } from '../components/common/CalendarDatePicker';
import { ExportButton, type ExportFormat } from '../components/common/ExportButton';
import { Checkbox } from '../components/common/Checkbox';
import { request } from '../services/apiClient';
import { adminService } from '../services/adminService';
import type { EventRecord } from '../types';
import type { ReportTrendDay, ReportSessionItem, ReportCheckpointItem, ReportCourseItem, ReportStudentAttendanceRow } from './auditPreviewRecords';
import { formatReportSession, formatReportStatus } from './auditPreviewRecords';

type Snapshot = {
  summary: { studentsCheckedIn: number; timeIns: number; timeOuts: number; totalScans: number };
  trend: { day: string; timeIns: number; timeOuts: number }[];
  sessions: { eventId: string; eventName: string; date: string; eventStartDate: string; period: string; timeIns: number; timeOuts: number }[];
  checkpoints: { name: string; inScans: number; outScans: number; total: number }[];
  courses: ReportCourseItem[];
  rows: { id: string; name: string; cardNumber?: string; course: string; session: string; day: string; period: string; timeIn: string | null; timeOut: string | null; status: ReportStudentAttendanceRow['status'] }[];
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
const toYMD = (d?: string | null) => (d ? (d.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '') : '');
const formatShortDate = (ymd: string) => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(`${ymd}T00:00:00+08:00`));
const formatManilaTime = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' }) : '-';
const getInitials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'ST';
const initialEnd = manilaDate(new Date());
const initialStart = manilaDate(new Date(Date.now() - 6 * 86400000));
const emptySummary = { studentsCheckedIn: 0, timeIns: 0, timeOuts: 0, totalScans: 0 };
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
  const [trendView, setTrendView] = useState<'bars' | 'wave'>('bars');

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
  const courseChartData = useMemo(() => {
    return courseList
      .map((c) => ({
        name: c.course,
        count: (c.timeIn + c.timeOut) || c.expected || 0,
        timeIn: c.timeIn,
        timeOut: c.timeOut,
        expected: c.expected,
      }))
      .filter((c) => c.count > 0);
  }, [courseList]);
  const filteredStudents: ReportStudentAttendanceRow[] = useMemo(() => (snapshot?.rows ?? []).map((row, index) => ({
    id: row.id, name: row.name, initials: getInitials(row.name),
    avatarBg: index % 2 ? 'bg-purple-200' : 'bg-purple-100', avatarColor: 'text-purple-800',
    course: row.course, session: row.session, day: row.day, period: row.period,
    timeIn: formatManilaTime(row.timeIn), timeOut: formatManilaTime(row.timeOut), status: row.status,
  })), [snapshot]);
  const eventLabel = event === 'all' ? 'All events' : events.find(item => item.id === event)?.name || 'Selected event';

  const handleEventChange = (selectedEventId: string) => {
    setEvent(selectedEventId);
    setSession('all');
    setSelected([]);
    if (selectedEventId === 'all') {
      setStartDate(initialStart);
      setEndDate(initialEnd);
    } else {
      const target = events.find((e) => e.id === selectedEventId);
      if (target) {
        const s = toYMD(target.start_date);
        const e = toYMD(target.end_date) || s;
        if (s) {
          setStartDate(s);
          setEndDate(e);
        }
      }
    }
  };

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
          rows.push({ id: row.id, name: row.name, initials: getInitials(row.name), avatarBg: '', avatarColor: '', cardNumber: row.cardNumber || '—', course: row.course, session: row.session, day: row.day, period: row.period, timeIn: formatManilaTime(row.timeIn), timeOut: formatManilaTime(row.timeOut), status: row.status });
        }
      }
      const { exportAttendance } = await import('./reportExports');
      await exportAttendance(rows, format, {
        startDate: params.startDate,
        endDate: params.endDate || endDate,
        eventName: eventLabel,
        systemName: 'Presnt',
        course: course !== 'all' ? course : undefined,
        session: session !== 'all' ? session : undefined,
        location: location !== 'all' ? location : undefined,
        type: type !== 'all' ? type : undefined,
      });
    } catch (err) {
      console.error('Export failed:', err);
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
      <div className="flex flex-wrap items-center gap-3">
        <Dropdown
          value={event}
          onChange={handleEventChange}
          options={[
            { value: 'all', label: 'All Events' },
            ...events.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />

        <CalendarDatePicker
          startDate={startDate}
          endDate={endDate}
          onChange={(range) => {
            setStartDate(range.startDate);
            setEndDate(range.endDate);
          }}
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

      <section aria-label="Attendance totals" className="rounded-2xl border border-[#E5E0EB] bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EDE8F1]">
          <h2 className="text-base font-extrabold text-[#24133F]">Attendance Totals</h2>
          <span className="text-xs font-semibold text-[#756883]">
            {eventLabel} · {formatShortDate(startDate)}–{formatShortDate(endDate)}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#EDE8F1] bg-[#FAF8FC] p-3">
            <span className="text-xs font-semibold text-[#756883]">Checked In</span>
            <p className="text-2xl font-black text-[#24133F] mt-0.5">{loading ? '—' : reportSummary.studentsCheckedIn.toLocaleString()}</p>
          </div>

          <div className="rounded-xl border border-[#EDE8F1] bg-[#FAF8FC] p-3">
            <span className="text-xs font-semibold text-emerald-700">Time In</span>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{loading ? '—' : reportSummary.timeIns.toLocaleString()}</p>
          </div>

          <div className="rounded-xl border border-[#EDE8F1] bg-[#FAF8FC] p-3">
            <span className="text-xs font-semibold text-rose-700">Time Out</span>
            <p className="text-2xl font-black text-rose-600 mt-0.5">{loading ? '—' : reportSummary.timeOuts.toLocaleString()}</p>
          </div>

          <div className="rounded-xl border border-[#EDE8F1] bg-[#FAF8FC] p-3">
            <span className="text-xs font-semibold text-[#7026B7]">Total Scans</span>
            <p className="text-2xl font-black text-[#7026B7] mt-0.5">{loading ? '—' : reportSummary.totalScans.toLocaleString()}</p>
          </div>
        </div>
      </section>

      {/* Row 1: Attendance Trend (Card 1) & Session Breakdown (Card 2) */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Card 1: Attendance Trend */}
        <section className="flex flex-col justify-between rounded-2xl border border-[#E5E0EB] bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold text-[#24133F]">Attendance Trend</h2>

              {/* View Switcher */}
              <div className="flex items-center rounded-lg bg-[#FAF8FC] p-0.5 border border-[#EDE8F1] text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setTrendView('bars')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    trendView === 'bars'
                      ? 'bg-white text-[#7026B7] shadow-2xs'
                      : 'text-[#756883] hover:text-[#24133F]'
                  }`}
                >
                  Bars
                </button>
                <button
                  type="button"
                  onClick={() => setTrendView('wave')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    trendView === 'wave'
                      ? 'bg-white text-[#7026B7] shadow-2xs'
                      : 'text-[#756883] hover:text-[#24133F]'
                  }`}
                >
                  Flow
                </button>
              </div>
            </div>

            {loading ? (
              <div className="my-4 flex h-44 items-center justify-center text-xs text-[#756883]">
                Loading attendance trend…
              </div>
            ) : trendData.length === 0 ? (
              <div className="my-4 flex h-44 items-center justify-center text-center text-xs text-[#756883]">
                No attendance records available.
              </div>
            ) : (
              <div className="mt-3 h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {trendView === 'bars' ? (
                    /* Stadium Bars with Background Tracks (Image 3 style) */
                    <BarChart data={trendData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EEF4" />
                      <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: '#EDE8F1' }} tick={{ fill: '#756883', fontSize: 11, fontWeight: 600 }} />
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
                        dataKey="present"
                        name="Time In"
                        fill="#10B981"
                        radius={[8, 8, 8, 8]}
                        background={{ fill: '#FAF8FC', radius: 8 }}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="absent"
                        name="Time Out"
                        fill="#EF4444"
                        radius={[8, 8, 8, 8]}
                        background={{ fill: '#FAF8FC', radius: 8 }}
                        maxBarSize={28}
                      />
                    </BarChart>
                  ) : (
                    /* Monotone Spline Flow Curve (Image 4 bottom right style) */
                    <AreaChart data={trendData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="repInGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="repOutGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EEF4" />
                      <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: '#EDE8F1' }} tick={{ fill: '#756883', fontSize: 11, fontWeight: 600 }} />
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
                        dataKey="present"
                        name="Time In"
                        stroke="#10B981"
                        strokeWidth={3}
                        fill="url(#repInGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="absent"
                        name="Time Out"
                        stroke="#EF4444"
                        strokeWidth={3}
                        fill="url(#repOutGrad)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#EDE8F1] flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Time In: <strong className="text-[#24133F]">{reportSummary.timeIns.toLocaleString()}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-rose-700">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Time Out: <strong className="text-[#24133F]">{reportSummary.timeOuts.toLocaleString()}</strong>
            </span>
          </div>
        </section>

        {/* Card 2: Session Breakdown */}
        <section className="flex flex-col rounded-2xl border border-[#E5E0EB] bg-white p-6">
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
        <section className="flex flex-col justify-between rounded-2xl border border-[#E5E0EB] bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#24133F]">Checkpoints</h2>
              <span className="text-xs font-semibold text-[#756883]">
                {checkpointList.length} stations
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[400px] text-left text-xs">
                <thead>
                  <tr className="text-[#756883] font-medium border-b border-[#EDE8F1]">
                    <th className="py-2.5 pr-4 font-medium">Checkpoint</th>
                    <th className="px-2 py-2.5 font-medium">In Scans</th>
                    <th className="px-2 py-2.5 font-medium">Out Scans</th>
                    <th className="py-2.5 pl-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EEF4]">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-[#756883]">
                        Loading checkpoints…
                      </td>
                    </tr>
                  ) : checkpointList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-[#756883]">
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
        <section className="flex flex-col justify-between rounded-2xl border border-[#E5E0EB] bg-white p-5 shadow-2xs">
          <div>
            <h2 className="text-base font-extrabold text-[#24133F]">Course Breakdown</h2>

            {/* Compact Course Donut Visualization */}
            {!loading && courseChartData.length > 0 && (
              <div className="relative my-2 flex h-36 w-full items-center justify-center">
                <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black text-[#24133F]">{courseChartData.length}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#756883]">Courses</span>
                </div>

                <div className="relative z-10 h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={courseChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={44}
                        outerRadius={62}
                        paddingAngle={3}
                        dataKey="count"
                      >
                        {courseChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COURSE_COLORS[index % COURSE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        wrapperStyle={{ zIndex: 100 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            const item = data.payload as { name: string; count: number; timeIn: number; timeOut: number; expected: number };
                            return (
                              <div className="rounded-xl border border-[#E5E0EB] bg-white px-3 py-2 text-xs shadow-md">
                                <p className="font-bold text-[#24133F] pb-1 border-b border-slate-100">{item.name}</p>
                                <div className="mt-1 flex items-center gap-3 text-[11px]">
                                  <span className="text-emerald-600 font-semibold">In: {item.timeIn}</span>
                                  <span className="text-rose-600 font-semibold">Out: {item.timeOut}</span>
                                  <span className="text-[#7026B7] font-bold">Roster: {item.expected}</span>
                                </div>
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
            )}

            <div className="mt-3 overflow-x-auto">
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
      <section className="rounded-2xl border border-[#E5E0EB] bg-white p-6">
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
                  <td className="py-3 text-[#24133F]">{formatReportSession(record.session, record.day, record.period)}</td>
                  <td className="py-3 text-[#24133F]">{record.timeIn || <span className="text-slate-300 font-mono">—</span>}</td>
                  <td className="py-3 text-[#24133F]">{record.timeOut || <span className="text-slate-300 font-mono">—</span>}</td>
                  <td className="py-3">
                    {(() => {
                      const status = formatReportStatus(record.status);
                      return (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status === 'No Time-Out'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {status}
                        </span>
                      );
                    })()}
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
