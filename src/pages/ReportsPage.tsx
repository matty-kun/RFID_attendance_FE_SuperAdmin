import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronRight, Pencil, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Dropdown } from '../components/common/Dropdown';
import { CalendarDatePicker } from '../components/common/CalendarDatePicker';
import { ExportButton, type ExportFormat } from '../components/common/ExportButton';
import { Checkbox } from '../components/common/Checkbox';
import { Button } from '../components/common/Button';
import { attendanceService } from '../features/attendance/services/attendanceService';
import { studentService } from '../features/students/services/studentService';
import { adminService } from '../services/adminService';
import { toast } from '../context';
import type { AttendanceRecord } from '../features/attendance/models';
import type { StudentRecord } from '../features/students/models';
import type { LocationRecord } from '../types';
import type {
  ReportTrendDay,
  ReportSessionItem,
  ReportCheckpointItem,
  ReportIssueItem,
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

const previewToday = new Date();
const initialEnd = manilaDate(previewToday);
const initialStart = manilaDate(new Date(previewToday.getTime() - 6 * 24 * 60 * 60 * 1000));

function exportCsv(rows: ReportStudentAttendanceRow[], endDate: string) {
  const escape = (value: string) => {
    const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const lines = [['Name', 'Course', 'Session', 'Time In', 'Time Out', 'Status'].join(',')];
  for (const row of rows) {
    lines.push([row.name, row.course, row.session, row.timeIn, row.timeOut, row.status].map(escape).join(','));
  }
  const url = URL.createObjectURL(new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance-report-${endDate || 'all'}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportExcel(rows: ReportStudentAttendanceRow[], endDate: string) {
  const lines = [['Name', 'Course', 'Session', 'Time In', 'Time Out', 'Status'].join('\t')];
  for (const row of rows) {
    lines.push([row.name, row.course, row.session, row.timeIn, row.timeOut, row.status].join('\t'));
  }
  const url = URL.createObjectURL(new Blob(['\uFEFF', lines.join('\r\n')], { type: 'application/vnd.ms-excel;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance-report-${endDate || 'all'}.xls`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportJson(rows: ReportStudentAttendanceRow[], endDate: string) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance-report-${endDate || 'all'}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReportsPage() {
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [registeredLocations, setRegisteredLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [session, setSession] = useState('all');
  const [course, setCourse] = useState('all');
  const [type, setType] = useState('all');
  const [location, setLocation] = useState('all');

  // Student Attendance Records search & selection
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const loadReportsData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [attRes, stuRes, locRes] = await Promise.all([
        attendanceService.getRecentAttendance(1, 'all', startDate, endDate, 100),
        studentService.getStudents(1, '').catch(() => ({ students: [], total: 0, page: 1, limit: 25 })),
        adminService.getLocations().catch(() => []),
      ]);
      setRecords(attRes.records);
      setStudents(stuRes.students);
      setTotalStudentsCount(stuRes.total);
      setRegisteredLocations(locRes);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not load report records. Try again.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void loadReportsData();
  }, [loadReportsData]);

  // Filter records by top-level dropdowns
  const filteredRawRecords = useMemo(() => {
    return records.filter((rec) => {
      if (session !== 'all' && (rec.session?.name || rec.session_id) !== session) return false;
      if (course !== 'all' && (rec.student?.course || 'Unspecified') !== course) return false;
      if (type !== 'all' && rec.type !== type) return false;
      if (location !== 'all' && (rec.location?.name || rec.location_id) !== location) return false;
      return true;
    });
  }, [records, session, course, type, location]);

  const sessions = useMemo(() => {
    return [...new Set(records.map((r) => r.session?.name).filter((n): n is string => Boolean(n)))].sort();
  }, [records]);

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

  // Card 2: Session Breakdown (derived from real records grouped by session)
  const sessionBreakdown: ReportSessionItem[] = useMemo(() => {
    const map = new Map<string, { timeIns: number; timeOuts: number }>();
    for (const r of filteredRawRecords) {
      const sName = r.session?.name || r.session_id.slice(0, 8);
      const cur = map.get(sName) || { timeIns: 0, timeOuts: 0 };
      if (r.type === 'time_in') cur.timeIns += 1;
      else cur.timeOuts += 1;
      map.set(sName, cur);
    }
    return Array.from(map.entries()).map(([name, counts]) => {
      const expected = totalStudentsCount;
      const noRecord = expected > 0 ? Math.max(0, expected - counts.timeIns) : 0;
      const rateNum = expected > 0 ? Math.min(100, Math.round((counts.timeIns / expected) * 100)) : 0;
      const rateBadgeColor =
        rateNum >= 85 ? 'bg-[#10B981]' : rateNum >= 60 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]';
      return {
        name,
        expected,
        timeIns: counts.timeIns,
        timeOuts: counts.timeOuts,
        noRecord,
        rate: expected > 0 ? `${rateNum}%` : '—',
        rateBadgeColor,
      };
    });
  }, [filteredRawRecords, totalStudentsCount]);

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

  // Card 6: Student Attendance Rows (derived by pairing time_in and time_out per student + session)
  const studentRecordsList: ReportStudentAttendanceRow[] = useMemo(() => {
    const pairMap = new Map<
      string,
      {
        id: string;
        name: string;
        course: string;
        session: string;
        timeIn: string;
        timeOut: string;
        hasIn: boolean;
        hasOut: boolean;
      }
    >();

    for (const r of filteredRawRecords) {
      const key = `${r.student_id}::${r.session_id}`;
      const existing = pairMap.get(key) || {
        id: key,
        name: r.student?.name || r.student?.student_id || r.student_id.slice(0, 8),
        course: r.student?.course || '—',
        session: r.session?.name || r.session_id.slice(0, 8),
        timeIn: '-',
        timeOut: '-',
        hasIn: false,
        hasOut: false,
      };
      if (r.type === 'time_in') {
        existing.timeIn = formatManilaTime(r.recorded_at);
        existing.hasIn = true;
      } else {
        existing.timeOut = formatManilaTime(r.recorded_at);
        existing.hasOut = true;
      }
      pairMap.set(key, existing);
    }

    return Array.from(pairMap.values()).map((item, idx) => {
      const status: ReportStudentAttendanceRow['status'] =
        item.hasIn && item.hasOut ? 'Completed' : item.hasIn && !item.hasOut ? 'Missing Out' : 'No Record';
      return {
        id: item.id,
        name: item.name,
        initials: getInitials(item.name),
        avatarBg: idx % 2 === 0 ? 'bg-purple-200' : 'bg-blue-200',
        avatarColor: idx % 2 === 0 ? 'text-purple-800' : 'text-blue-800',
        course: item.course,
        session: item.session,
        timeIn: item.timeIn,
        timeOut: item.timeOut,
        status,
      };
    });
  }, [filteredRawRecords]);

  // Card 4: Issues (computed from real paired records and student roster)
  const issueList: ReportIssueItem[] = useMemo(() => {
    const missingTimeOutCount = studentRecordsList.filter((r) => r.status === 'Missing Out').length;
    const outWithoutInCount = studentRecordsList.filter((r) => r.timeIn === '-' && r.timeOut !== '-').length;
    const uncardedStudentsCount = students.filter((s) => !s.rfid_uid).length;

    return [
      {
        id: 'iss-1',
        title: 'Missing Time Out',
        subtitle: 'Checked in with no time out scan',
        count: missingTimeOutCount,
        badgeBg: 'bg-[#F59E0B]',
      },
      {
        id: 'iss-2',
        title: 'Time Out Without Time In',
        subtitle: 'Recorded time out without prior check in',
        count: outWithoutInCount,
        badgeBg: 'bg-[#EF4444]',
      },
      {
        id: 'iss-3',
        title: 'Unassigned RFID Cards',
        subtitle: 'Students without a linked RFID card (current page)',
        count: uncardedStudentsCount,
        badgeBg: 'bg-[#F59E0B]',
      },
    ];
  }, [studentRecordsList, students]);

  // Card 5: Course Breakdown (computed from real records & student courses)
  const courseList: ReportCourseItem[] = useMemo(() => {
    const map = new Map<string, { expected: number; timeIn: number; timeOut: number }>();
    for (const s of students) {
      const c = s.course || 'Unspecified';
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
  }, [students, filteredRawRecords]);

  // Card 6: Filtered Student Records
  const filteredStudents = useMemo(() => {
    return studentRecordsList.filter((row) => {
      const matchesSearch =
        search === '' ||
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.course.toLowerCase().includes(search.toLowerCase()) ||
        row.session.toLowerCase().includes(search.toLowerCase()) ||
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
    if (format === 'csv') {
      exportCsv(exportRows, endDate);
    } else if (format === 'xlsx') {
      exportExcel(exportRows, endDate);
    } else if (format === 'json') {
      exportJson(exportRows, endDate);
    } else if (format === 'pdf') {
      window.print();
    }
  };

  const handleImmutableNotice = () => {
    toast.error('Attendance records are an immutable audit log and cannot be modified or deleted.');
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6 text-[#24133F]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold leading-tight">Reports &amp; Exports</h1>
          <p className="text-xs text-[#756883]">Attendance activity for selected dates and filters.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void loadReportsData()}
          isLoading={loading}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
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
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="h-10 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs font-semibold text-[#756883] hover:bg-slate-50 hover:text-[#24133F]"
          >
            All dates
          </button>
        )}

        <Dropdown
          value={session}
          onChange={setSession}
          options={[
            { value: 'all', label: 'All Sessions' },
            ...sessions.map((s) => ({ value: s, label: s })),
          ]}
        />

        <Dropdown
          value={course}
          onChange={setCourse}
          options={[
            { value: 'all', label: 'All Courses' },
            ...courses.map((c) => ({ value: c, label: c })),
          ]}
        />

        <Dropdown
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'time_in', label: 'Time In' },
            { value: 'time_out', label: 'Time Out' },
          ]}
        />

        <Dropdown
          value={location}
          onChange={setLocation}
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
                        className="w-full rounded-[14px] bg-[#24133F] transition-all duration-300"
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
              <span className="h-2.5 w-2.5 rounded-full bg-[#24133F]" />
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
            <p className="text-xs text-[#756883] mt-0.5">Recorded scans per session</p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-xs">
              <thead>
                <tr className="text-[#756883] font-medium">
                  <th className="py-2.5 font-medium">Sessions</th>
                  <th className="py-2.5 font-medium">Expected</th>
                  <th className="py-2.5 font-medium">Time In</th>
                  <th className="py-2.5 font-medium">Time Out</th>
                  <th className="py-2.5 font-medium">No Record</th>
                  <th className="py-2.5 font-medium text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1EEF4]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#756883]">
                      Loading session breakdown…
                    </td>
                  </tr>
                ) : sessionBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#756883]">
                      No attendance records available.
                    </td>
                  </tr>
                ) : (
                  sessionBreakdown.map((row) => (
                    <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 text-[#756883] font-normal">{row.name}</td>
                      <td className="py-2.5 text-[#756883]">{row.expected || '—'}</td>
                      <td className="py-2.5 text-[#756883]">{row.timeIns}</td>
                      <td className="py-2.5 text-[#756883]">{row.timeOuts}</td>
                      <td className="py-2.5 text-[#756883]">{row.noRecord}</td>
                      <td className="py-2.5 text-right">
                        <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold text-white ${row.rateBadgeColor}`}>
                          {row.rate}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Row 2: Checkpoints (Card 3), Issues (Card 4), Course Breakdown (Card 5) */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 3: Checkpoints */}
        <section className="rounded-[24px] border border-[#E5E0EB] bg-white p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Checkpoints</h2>
            <p className="text-xs text-[#756883] mt-0.5">Scans by checkpoint location</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#756883] font-medium">
                    <th className="py-2.5 font-medium">Checkpoint</th>
                    <th className="py-2.5 font-medium">In Scans</th>
                    <th className="py-2.5 font-medium">Out Scans</th>
                    <th className="py-2.5 font-medium text-right">Total</th>
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
                        <td className="py-2.5 text-[#756883] font-normal">{row.name}</td>
                        <td className="py-2.5 text-[#756883]">{row.inScans.toLocaleString()}</td>
                        <td className="py-2.5 text-[#756883]">{row.outScans.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-[#756883] font-medium">{row.total.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Card 4: Issues */}
        <section className="rounded-[24px] border border-[#E5E0EB] bg-white p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Issues</h2>

            <div className="mt-4 space-y-2.5">
              {issueList.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${issue.badgeBg} flex items-center justify-center shrink-0 shadow-sm`}>
                      <div className="w-6 h-6 rounded-full border border-white/50 flex items-center justify-center text-xs font-bold text-white">
                        !
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#24133F] leading-tight">{issue.title}</h3>
                      <p className="text-xs text-[#756883] mt-0.5">{issue.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#24133F]">{loading ? '—' : issue.count}</span>
                    <ChevronRight className="h-5 w-5 text-[#756883]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Card 5: Course Breakdown */}
        <section className="rounded-[24px] border border-[#E5E0EB] bg-white p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Course Breakdown</h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#756883] font-medium">
                    <th className="py-2.5 font-medium">Courses</th>
                    <th className="py-2.5 font-medium">Enrolled</th>
                    <th className="py-2.5 font-medium">Time In</th>
                    <th className="py-2.5 font-medium text-right">Time Out</th>
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
                        <td className="py-2.5 text-[#756883] font-normal">{row.course}</td>
                        <td className="py-2.5 text-[#756883]">{row.expected}</td>
                        <td className="py-2.5 text-[#756883]">{row.timeIn}</td>
                        <td className="py-2.5 text-right text-[#756883]">{row.timeOut}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Row 3: Student Attendance Records (Card 6) */}
      <section className="rounded-[24px] border border-[#E5E0EB] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Student Attendance Records</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#756883]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-56 md:w-64 pl-9 pr-4 py-1.5 rounded-full border border-[#E5E0EB] text-xs text-[#24133F] placeholder-[#756883] focus:outline-none focus:border-[#24133F] transition-colors"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
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
                <th className="w-6 py-3 font-medium"></th>
                <th className="py-3 font-medium">Course</th>
                <th className="py-3 font-medium">Session</th>
                <th className="py-3 font-medium">Time In</th>
                <th className="py-3 font-medium">Time Out</th>
                <th className="py-3 font-medium">Status</th>
                <th className="w-20 py-3 text-right"></th>
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
                  <td className="py-3 text-[#756883]"></td>
                  <td className="py-3 text-[#24133F]">{record.course}</td>
                  <td className="py-3 text-[#24133F]">{record.session}</td>
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
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title="Attendance records are immutable and cannot be edited"
                        onClick={handleImmutableNotice}
                        className="p-1 text-[#756883] opacity-40 cursor-not-allowed rounded"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Attendance records are immutable and cannot be deleted"
                        onClick={handleImmutableNotice}
                        className="p-1 text-[#EF4444] opacity-40 cursor-not-allowed rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
