import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, ChevronDown, Download, Search } from 'lucide-react';
import { Button } from '../components/common/Button';
import { attendanceService } from '../features/attendance/services/attendanceService';
import type { AttendanceRecord } from '../features/attendance/models';
import { isDevPreview } from '../features/auth/devPreview';
import { auditPreviewRecords } from './auditPreviewRecords';

type ReportRow = {
  key: string;
  student: string;
  studentId: string;
  course: string;
  session: string;
  timeIn?: string;
  timeOut?: string;
  lastScan: string;
};

const manilaDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};
const displayDay = (date: string) => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(`${date}T00:00:00+08:00`));
const displayTime = (date?: string) => date ? new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }).format(new Date(date)) : '—';
const previewToday = new Date();
const initialEnd = manilaDate(previewToday);
const initialStart = manilaDate(new Date(previewToday.getTime() - 3 * 24 * 60 * 60 * 1000));

function groupScans(records: AttendanceRecord[]): ReportRow[] {
  const rows = new Map<string, ReportRow>();
  for (const record of records) {
    const key = `${record.student_id}:${record.session_id}:${manilaDate(new Date(record.recorded_at))}`;
    const row = rows.get(key) ?? {
      key,
      student: record.student?.name ?? 'Unknown student',
      studentId: record.student?.student_id ?? record.student_id,
      course: record.student?.course ?? 'Unknown course',
      session: record.session?.name ?? 'Unknown session',
      lastScan: record.recorded_at,
    };
    if (record.type === 'time_in' && (!row.timeIn || record.recorded_at < row.timeIn)) row.timeIn = record.recorded_at;
    if (record.type === 'time_out' && (!row.timeOut || record.recorded_at > row.timeOut)) row.timeOut = record.recorded_at;
    if (record.recorded_at > row.lastScan) row.lastScan = record.recorded_at;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.lastScan.localeCompare(a.lastScan));
}

function rowStatus(row: ReportRow, type: string) {
  if (type === 'time_in') return 'Time In';
  if (type === 'time_out') return 'Time Out';
  return row.timeIn && row.timeOut ? 'Completed' : row.timeIn ? 'Missing Out' : 'Missing In';
}

function exportCsv(rows: ReportRow[], type: string, endDate: string) {
  const escape = (value: string) => {
    const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const lines = [['Student', 'Student ID', 'Course', 'Session', 'Time In', 'Time Out', 'Status'].join(',')];
  for (const row of rows) lines.push([
    row.student, row.studentId, row.course, row.session,
    row.timeIn ? new Date(row.timeIn).toISOString() : '',
    row.timeOut ? new Date(row.timeOut).toISOString() : '',
    rowStatus(row, type),
  ].map(escape).join(','));
  const url = URL.createObjectURL(new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance-report-${endDate}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReportsPage() {
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState('all');
  const [course, setCourse] = useState('all');
  const [type, setType] = useState('all');
  const [location, setLocation] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const request = isDevPreview()
      ? Promise.resolve({ records: auditPreviewRecords.filter((record) => {
        const day = manilaDate(new Date(record.recorded_at));
        return day >= startDate && day <= endDate;
      }), total: auditPreviewRecords.filter((record) => {
        const day = manilaDate(new Date(record.recorded_at));
        return day >= startDate && day <= endDate;
      }).length })
      : attendanceService.getRecentAttendance(1, 'all', startDate, endDate, 100);
    request.then((data) => { if (active) { setRecords(data.records); setTotal(data.total); setSelected([]); } })
      .catch(() => { if (active) setError('Could not load report records. Try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [startDate, endDate]);

  const sessions = useMemo(() => [...new Set(records.map((record) => record.session?.name).filter((name): name is string => Boolean(name)))].sort(), [records]);
  const courses = useMemo(() => [...new Set(records.map((record) => record.student?.course).filter((name): name is string => Boolean(name)))].sort(), [records]);
  const locations = useMemo(() => [...new Set(records.map((record) => record.location?.name).filter((name): name is string => Boolean(name)))].sort(), [records]);
  const filtered = useMemo(() => records.filter((record) =>
    (session === 'all' || record.session?.name === session)
    && (course === 'all' || record.student?.course === course)
    && (type === 'all' || record.type === type)
    && (location === 'all' || record.location?.name === location)), [records, session, course, type, location]);
  const groupedRows = useMemo(() => groupScans(filtered), [filtered]);
  const rows = useMemo(() => groupedRows.filter((row) => `${row.student} ${row.studentId} ${row.course} ${row.session}`.toLowerCase().includes(search.toLowerCase())), [groupedRows, search]);
  const days = useMemo(() => {
    const counts = new Map<string, { date: string; timeIns: number; timeOuts: number }>();
    for (const record of filtered) {
      const date = manilaDate(new Date(record.recorded_at));
      const day = counts.get(date) ?? { date, timeIns: 0, timeOuts: 0 };
      if (record.type === 'time_in') day.timeIns++; else day.timeOuts++;
      counts.set(date, day);
    }
    return [...counts.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);
  const peak = Math.max(1, ...days.map((day) => day.timeIns + day.timeOuts));
  const sessionRows = useMemo(() => [...new Set(filtered.map((record) => record.session?.name ?? 'Unknown session'))].map((name) => ({ name, timeIns: filtered.filter((record) => record.session?.name === name && record.type === 'time_in').length, timeOuts: filtered.filter((record) => record.session?.name === name && record.type === 'time_out').length })), [filtered]);
  const checkpointRows = useMemo(() => [...new Set(filtered.map((record) => record.location?.name ?? 'Unknown checkpoint'))].map((name) => ({ name, timeIns: filtered.filter((record) => record.location?.name === name && record.type === 'time_in').length, timeOuts: filtered.filter((record) => record.location?.name === name && record.type === 'time_out').length })), [filtered]);
  const courseRows = useMemo(() => [...new Set(filtered.map((record) => record.student?.course ?? 'Unknown course'))].map((name) => ({ name, timeIns: filtered.filter((record) => record.student?.course === name && record.type === 'time_in').length, timeOuts: filtered.filter((record) => record.student?.course === name && record.type === 'time_out').length })), [filtered]);
  const missingOut = type === 'all' ? groupedRows.filter((row) => row.timeIn && !row.timeOut).length : null;
  const missingIn = type === 'all' ? groupedRows.filter((row) => !row.timeIn && row.timeOut).length : null;
  const exportRows = selected.length ? rows.filter((row) => selected.includes(row.key)) : rows;

  return <div className="mx-auto w-full max-w-[1120px] space-y-4 text-[#24133F]">
    <div><h1 className="text-[23px] font-extrabold leading-tight">Reports &amp; Exports</h1><p className="text-xs text-[#756883]">Attendance activity for selected dates and filters.</p>{isDevPreview() && <p className="mt-1 text-[11px] font-bold text-brand-700">Sample attendance data · UI preview only</p>}</div>
    {error && <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="h-4 w-4" />{error}</p>}
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs"><CalendarDays className="h-4 w-4 text-[#756883]" /><span className="sr-only">From</span><input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="bg-transparent outline-none" /></label>
      <label className="flex h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs"><span className="sr-only">To</span><input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="bg-transparent outline-none" /></label>
      {([['Session', session, setSession, sessions], ['Course', course, setCourse, courses], ['Type', type, setType, ['time_in', 'time_out']], ['Location', location, setLocation, locations]] as const).map(([label, value, setter, options]) => <label key={label} className="flex h-10 items-center gap-1 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs"><span className="sr-only">{label}</span><select value={value} onChange={(event) => setter(event.target.value)} className="max-w-32 bg-transparent font-semibold outline-none"><option value="all">All {label === 'Type' ? 'Attendance Types' : `${label}s`}</option>{options.map((option) => <option key={option} value={option}>{option === 'time_in' ? 'Time In' : option === 'time_out' ? 'Time Out' : option}</option>)}</select><ChevronDown className="h-3 w-3 text-[#756883]" /></label>)}
      <Button
        variant="primary"
        className="ml-auto"
        leftIcon={<Download className="h-4 w-4" />}
        onClick={() => exportCsv(exportRows, type, endDate)}
        disabled={!exportRows.length}
      >
        Export CSV
      </Button>
    </div>
    {total > 100 && <p className="text-xs text-[#756883]">Showing newest 100 of {total.toLocaleString()} scans. Breakdowns and export cover only these loaded records.</p>}
    <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
      <section className="min-h-[270px] rounded-2xl border border-[#E5E0EB] bg-white p-4"><h2 className="text-sm font-extrabold">Attendance Trend</h2><p className="text-[10px] text-[#756883]">Recorded time ins and time outs by day</p><div className="mt-6 flex h-40 items-end justify-around gap-4">{days.length ? days.map((day) => <div key={day.date} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="pointer-events-none absolute bottom-full z-10 hidden rounded-lg bg-[#24133F] px-3 py-2 text-[11px] text-white shadow-xl group-hover:block">{displayDay(day.date)} · {day.timeIns} in · {day.timeOuts} out</div><div className="flex w-9 flex-col-reverse overflow-hidden rounded-md" style={{ height: `${Math.max(8, (day.timeIns + day.timeOuts) / peak * 100)}%` }}><div className="bg-[#24133F]" style={{ flex: day.timeIns }} /><div className="bg-[#EF3340]" style={{ flex: day.timeOuts }} /></div><span className="whitespace-nowrap text-[10px] text-[#637596]">{displayDay(day.date)}</span></div>) : <p className="self-center text-xs text-[#756883]">{loading ? 'Loading trend…' : 'No scans for these filters.'}</p>}</div><div className="mt-4 flex gap-4 text-[10px] text-[#637596]"><span>● <span className="text-[#24133F]">Time In</span></span><span>● <span className="text-[#EF3340]">Time Out</span></span></div></section>
      <section className="min-h-[270px] rounded-2xl border border-[#E5E0EB] bg-white p-4"><h2 className="text-sm font-extrabold">Session Breakdown</h2><p className="text-[10px] text-[#756883]">Scans in the loaded report</p><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[380px] text-left text-[11px]"><thead className="text-[10px] text-[#637596]"><tr><th className="py-2 font-medium">Session</th><th className="font-medium">Expected</th><th className="font-medium">Time In</th><th className="font-medium">Time Out</th><th className="font-medium">No Record</th><th className="font-medium">Rate</th></tr></thead><tbody>{sessionRows.map((row) => <tr key={row.name} className="border-t border-[#EEF0F4]"><td className="py-2 font-semibold">{row.name}</td><td>—</td><td>{row.timeIns}</td><td>{row.timeOuts}</td><td>—</td><td>—</td></tr>)}</tbody></table>{!sessionRows.length && <p className="py-8 text-center text-xs text-[#756883]">No sessions in this report.</p>}</div><p className="mt-3 text-[10px] text-[#756883]">Expected, No Record, and Rate need an attendance requirement rule.</p></section>
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-[#E5E0EB] bg-white p-4"><h2 className="text-sm font-extrabold">Checkpoints</h2><p className="text-[10px] text-[#756883]">Recorded scans by location</p><div className="mt-3 space-y-2">{checkpointRows.map((row) => <div key={row.name} className="flex items-center justify-between gap-2 border-b border-[#EEF0F4] py-2 text-xs"><span className="truncate font-semibold">{row.name}</span><span className="whitespace-nowrap text-[#637596]">{row.timeIns} in · {row.timeOuts} out</span></div>)}{!checkpointRows.length && <p className="py-6 text-xs text-[#756883]">No checkpoint scans.</p>}</div></section>
      <section className="rounded-2xl border border-[#E5E0EB] bg-white p-4"><h2 className="text-sm font-extrabold">Issues</h2><p className="text-[10px] text-[#756883]">Incomplete scan pairs in loaded records</p><div className="mt-4 space-y-3"><div className="flex justify-between rounded-xl bg-[#FFF2DE] p-3 text-xs"><span className="font-bold text-[#A96800]">Missing Time Out</span><strong>{missingOut ?? '—'}</strong></div><div className="flex justify-between rounded-xl bg-[#FDE8EA] p-3 text-xs"><span className="font-bold text-[#C52736]">Missing Time In</span><strong>{missingIn ?? '—'}</strong></div></div>{type !== 'all' && <p className="mt-3 text-[10px] text-[#756883]">Select All Attendance Types to assess pairs.</p>}</section>
      <section className="rounded-2xl border border-[#E5E0EB] bg-white p-4"><h2 className="text-sm font-extrabold">Course Breakdown</h2><p className="text-[10px] text-[#756883]">Scans by student course</p><div className="mt-3 space-y-2">{courseRows.map((row) => <div key={row.name} className="flex items-center justify-between gap-2 border-b border-[#EEF0F4] py-2 text-xs"><span className="truncate font-semibold">{row.name}</span><span className="whitespace-nowrap text-[#637596]">{row.timeIns} in · {row.timeOuts} out</span></div>)}{!courseRows.length && <p className="py-6 text-xs text-[#756883]">No course data.</p>}</div></section>
    </div>
    <section className="rounded-2xl border border-[#E5E0EB] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-extrabold">Student Attendance Records</h2><p className="text-[10px] text-[#756883]">Read-only report · {rows.length} grouped records</p></div><label className="flex h-9 items-center gap-2 rounded-xl border border-[#E5E0EB] px-3 text-[#756883]"><Search className="h-4 w-4" /><span className="sr-only">Search loaded records</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search loaded records" className="bg-transparent text-xs outline-none" /></label></div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="text-[10px] uppercase text-[#637596]"><tr className="border-b border-[#E5E0EB]"><th className="py-2"><input type="checkbox" aria-label="Select all visible rows" checked={rows.length > 0 && rows.every((row) => selected.includes(row.key))} onChange={(event) => setSelected(event.target.checked ? rows.map((row) => row.key) : [])} /></th><th>Student</th><th>Course</th><th>Session</th><th>Time In</th><th>Time Out</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key} className="border-b border-[#EEF0F4] last:border-b-0"><td className="py-3"><input type="checkbox" aria-label={`Select ${row.student}`} checked={selected.includes(row.key)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, row.key] : current.filter((key) => key !== row.key))} /></td><td className="py-3 font-bold">{row.student}<span className="block text-[10px] font-normal text-[#637596]">{row.studentId}</span></td><td>{row.course}</td><td>{row.session}</td><td>{displayTime(row.timeIn)}</td><td>{displayTime(row.timeOut)}</td><td><span className={`rounded-xl px-2 py-1 text-[10px] font-bold ${rowStatus(row, type) === 'Completed' ? 'bg-[#E4F7EB] text-[#16883F]' : 'bg-[#FFF2DE] text-[#A96800]'}`}>{rowStatus(row, type)}</span></td></tr>)}</tbody></table>{!rows.length && <p className="py-10 text-center text-xs text-[#756883]">{loading ? 'Loading records…' : 'No records match these filters.'}</p>}</div></section>
  </div>;
}
