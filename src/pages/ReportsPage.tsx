import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ChevronRight, Pencil, Search, Trash2, X, Check } from 'lucide-react';
import { Dropdown } from '../components/common/Dropdown';
import { CalendarDatePicker } from '../components/common/CalendarDatePicker';
import { ExportButton, type ExportFormat } from '../components/common/ExportButton';
import { DeleteConfirmationModal } from '../components/common/DeleteConfirmationModal';
import { Checkbox } from '../components/common/Checkbox';
import { attendanceService } from '../features/attendance/services/attendanceService';
import type { AttendanceRecord } from '../features/attendance/models';
import { isDevPreview } from '../features/auth/devPreview';
import {
  auditPreviewRecords,
  defaultTrendDays,
  defaultSessionBreakdown,
  defaultCheckpoints,
  defaultIssues,
  defaultCourseBreakdown,
  defaultStudentRecords,
  type ReportTrendDay,
  type ReportSessionItem,
  type ReportCheckpointItem,
  type ReportIssueItem,
  type ReportCourseItem,
  type ReportStudentAttendanceRow,
} from './auditPreviewRecords';

const manilaDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};

const previewToday = new Date();
const initialEnd = manilaDate(previewToday);
const initialStart = manilaDate(new Date(previewToday.getTime() - 3 * 24 * 60 * 60 * 1000));

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
  link.download = `attendance-report-${endDate}.csv`;
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
  link.download = `attendance-report-${endDate}.xls`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportJson(rows: ReportStudentAttendanceRow[], endDate: string) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance-report-${endDate}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReportsPage() {
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState('all');
  const [course, setCourse] = useState('all');
  const [type, setType] = useState('all');
  const [location, setLocation] = useState('all');

  // Student Attendance Records state
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [studentRecordsList, setStudentRecordsList] = useState<ReportStudentAttendanceRow[]>(defaultStudentRecords);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<ReportStudentAttendanceRow | null>(null);
  const [editStatus, setEditStatus] = useState<'Completed' | 'Missing Out' | 'No Record'>('Completed');
  const [editTimeIn, setEditTimeIn] = useState('');
  const [editTimeOut, setEditTimeOut] = useState('');

  // Delete Modal State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const request = isDevPreview()
      ? Promise.resolve({
          records: auditPreviewRecords.filter((record) => {
            const day = manilaDate(new Date(record.recorded_at));
            return day >= startDate && day <= endDate;
          }),
          total: auditPreviewRecords.length,
        })
      : attendanceService.getRecentAttendance(1, 'all', startDate, endDate, 100);

    request
      .then((data) => {
        if (active) {
          setRecords(data.records);
          setTotal(data.total);
        }
      })
      .catch(() => {
        if (active) setError('Could not load report records. Showing preview data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [startDate, endDate]);

  const sessions = useMemo(() => {
    const list = [...new Set(records.map((r) => r.session?.name).filter((n): n is string => Boolean(n)))];
    return list.length ? list : ['Day 1 - Morning', 'Day 1 - Afternoon', 'Day 2 - Morning', 'Day 2 - Afternoon', 'Day 3 - Morning', 'Day 3 - Afternoon', 'Day 4 - Morning', 'Day 4 - Afternoon'];
  }, [records]);

  const courses = useMemo(() => {
    const list = [...new Set(records.map((r) => r.student?.course).filter((c): c is string => Boolean(c)))];
    return list.length ? list : ['BSIT', 'BSBA', 'BSCS', 'BSED', 'BSHM', 'BSCRIM'];
  }, [records]);

  const locations = useMemo(() => {
    const list = [...new Set(records.map((r) => r.location?.name).filter((l): l is string => Boolean(l)))];
    return list.length ? list : ['Gym', 'Primera', 'ETD Court', 'Field', 'JBB', 'RSB Lobby'];
  }, [records]);

  // Card 1: Attendance Trend
  const trendData: ReportTrendDay[] = defaultTrendDays;

  // Card 2: Session Breakdown
  const sessionBreakdown: ReportSessionItem[] = defaultSessionBreakdown;

  // Card 3: Checkpoints
  const checkpointList: ReportCheckpointItem[] = defaultCheckpoints;

  // Card 4: Issues
  const issueList: ReportIssueItem[] = defaultIssues;

  // Card 5: Course Breakdown
  const courseList: ReportCourseItem[] = defaultCourseBreakdown;

  // Card 6: Filtered Student Records
  const filteredStudents = useMemo(() => {
    return studentRecordsList.filter((row) => {
      const matchesSearch = search === '' ||
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

  const handleEdit = (record: ReportStudentAttendanceRow) => {
    setEditingRecord(record);
    setEditStatus(record.status);
    setEditTimeIn(record.timeIn);
    setEditTimeOut(record.timeOut);
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    setStudentRecordsList((prev) =>
      prev.map((item) =>
        item.id === editingRecord.id
          ? {
              ...item,
              status: editStatus,
              timeIn: editTimeIn || '-',
              timeOut: editTimeOut || '-',
            }
          : item
      )
    );
    setEditingRecord(null);
  };

  const handleDeleteConfirm = () => {
    if (!deletingId) return;
    setStudentRecordsList((prev) => prev.filter((item) => item.id !== deletingId));
    setSelected((prev) => prev.filter((id) => id !== deletingId));
    setDeletingId(null);
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6 text-[#24133F]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold leading-tight">Reports &amp; Exports</h1>
        <p className="text-xs text-[#756883]">Attendance activity for selected dates and filters.</p>
        {isDevPreview() && <p className="mt-1 text-[11px] font-bold text-brand-700">Sample attendance data · UI preview only</p>}
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <CalendarDatePicker
          startDate={startDate}
          endDate={endDate}
          onChange={(range) => {
            if (range.startDate) setStartDate(range.startDate);
            if (range.endDate) setEndDate(range.endDate);
          }}
        />

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
        <section className="flex flex-col justify-between rounded-[24px] border border-[#E5E0EB] bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Attendance Trend</h2>
            <p className="text-xs text-[#756883] mt-0.5">Present, Late and Absent Per Day</p>
          </div>

          <div className="my-6 flex h-52 items-end justify-around gap-4 px-2">
            {trendData.map((item) => (
              <div key={item.day} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                {/* Tooltip */}
                <div className="pointer-events-none absolute -top-8 z-10 hidden rounded-lg bg-[#24133F] px-3 py-1.5 text-[11px] font-medium text-white shadow-xl group-hover:block whitespace-nowrap">
                  {item.day}: {item.present} Present · {item.absent} Absent
                </div>

                {/* Stacked Stadium Bars */}
                <div className="flex w-12 h-44 flex-col justify-end gap-1.5">
                  {/* Absent segment (Top) */}
                  <div
                    className="w-full rounded-[14px] bg-[#EF3340] transition-all duration-300"
                    style={{ height: `${item.absentPct}%` }}
                  />
                  {/* Present segment (Bottom) */}
                  <div
                    className="w-full rounded-[14px] bg-[#24133F] transition-all duration-300"
                    style={{ height: `${item.presentPct}%` }}
                  />
                </div>

                <span className="mt-3 text-xs font-medium text-[#756883]">{item.day}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs text-[#756883] font-medium">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#24133F]" />
              Present
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EF3340]" />
              Absent
            </span>
          </div>
        </section>

        {/* Card 2: Session Breakdown */}
        <section className="flex flex-col justify-between rounded-[24px] border border-[#E5E0EB] bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Session Breakdown</h2>
            <p className="text-xs text-[#756883] mt-0.5">Present, Late and Absent Per Day</p>
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
                {sessionBreakdown.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 text-[#756883] font-normal">{row.name}</td>
                    <td className="py-2.5 text-[#756883]">{row.expected || '—'}</td>
                    <td className="py-2.5 text-[#756883]">{row.timeIns || '—'}</td>
                    <td className="py-2.5 text-[#756883]">{row.timeOuts || '—'}</td>
                    <td className="py-2.5 text-[#756883]">{row.noRecord || '—'}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold text-white ${row.rateBadgeColor}`}>
                        {row.rate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Row 2: Checkpoints (Card 3), Issues (Card 4), Course Breakdown (Card 5) */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 3: Checkpoints */}
        <section className="rounded-[24px] border border-[#E5E0EB] bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Checkpoints</h2>
            <p className="text-xs text-[#756883] mt-0.5">Present, Late and Absent Per Day</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#756883] font-medium">
                    <th className="py-2.5 font-medium">Sessions</th>
                    <th className="py-2.5 font-medium">In Scans</th>
                    <th className="py-2.5 font-medium">Out Scans</th>
                    <th className="py-2.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EEF4]">
                  {checkpointList.map((row) => (
                    <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 text-[#756883] font-normal">{row.name}</td>
                      <td className="py-2.5 text-[#756883]">{row.inScans.toLocaleString()}</td>
                      <td className="py-2.5 text-[#756883]">{row.outScans.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-[#756883] font-medium">{row.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Card 4: Issues */}
        <section className="rounded-[24px] border border-[#E5E0EB] bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Issues</h2>

            <div className="mt-4 space-y-2.5">
              {issueList.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
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
                    <span className="text-sm font-bold text-[#24133F]">{issue.count}</span>
                    <ChevronRight className="h-5 w-5 text-[#756883] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Card 5: Course Breakdown */}
        <section className="rounded-[24px] border border-[#E5E0EB] bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#24133F]">Course Breakdown</h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#756883] font-medium">
                    <th className="py-2.5 font-medium">Courses</th>
                    <th className="py-2.5 font-medium">Expected</th>
                    <th className="py-2.5 font-medium">Time In</th>
                    <th className="py-2.5 font-medium text-right">Time Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EEF4]">
                  {courseList.map((row) => (
                    <tr key={row.course} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 text-[#756883] font-normal">{row.course}</td>
                      <td className="py-2.5 text-[#756883]">{row.expected}</td>
                      <td className="py-2.5 text-[#756883]">{row.timeIn}</td>
                      <td className="py-2.5 text-right text-[#756883]">{row.timeOut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Row 3: Student Attendance Records (Card 6) */}
      <section className="rounded-[24px] border border-[#E5E0EB] bg-white p-6 shadow-sm">
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
                <th className="w-6 py-3 font-medium">...</th>
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
                        title="Edit record"
                        onClick={() => handleEdit(record)}
                        className="p-1 text-[#756883] hover:text-[#24133F] transition-colors rounded hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Delete record"
                        onClick={() => setDeletingId(record.id)}
                        className="p-1 text-[#EF4444] hover:text-red-700 transition-colors rounded hover:bg-rose-50"
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
              {loading ? 'Loading records…' : 'No records match these filters.'}
            </p>
          )}
        </div>
      </section>

      {/* Edit Record Modal (with modern clean glass blur backdrop) */}
      {editingRecord && createPortal(
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingRecord(null);
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#170D29]/40 p-4 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
            className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl border border-[#E5E0EB] animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#F1EEF4]">
              <h3 id="edit-modal-title" className="text-base font-bold text-[#24133F]">Edit Attendance Record</h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1 text-[#756883] hover:text-[#24133F] rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#756883] mb-1">Student</label>
                <p className="text-sm font-bold text-[#24133F]">{editingRecord.name} ({editingRecord.course})</p>
                <p className="text-xs text-[#756883]">{editingRecord.session}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#756883] mb-1">Status</label>
                <div className="flex gap-2">
                  {(['Completed', 'Missing Out', 'No Record'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-colors ${
                        editStatus === st
                          ? st === 'Completed'
                            ? 'bg-[#10B981] text-white'
                            : st === 'Missing Out'
                            ? 'bg-[#F59E0B] text-white'
                            : 'bg-[#EF4444] text-white'
                          : 'bg-slate-100 text-[#756883] hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#756883] mb-1">Time In</label>
                  <input
                    type="text"
                    value={editTimeIn}
                    onChange={(e) => setEditTimeIn(e.target.value)}
                    placeholder="e.g. 8:00 AM"
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E0EB] text-xs text-[#24133F] focus:outline-none focus:border-[#24133F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#756883] mb-1">Time Out</label>
                  <input
                    type="text"
                    value={editTimeOut}
                    onChange={(e) => setEditTimeOut(e.target.value)}
                    placeholder="e.g. 5:00 PM"
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E0EB] text-xs text-[#24133F] focus:outline-none focus:border-[#24133F]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-[#F1EEF4]">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#756883] hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#24133F] hover:bg-[#341d5b] transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        itemName={studentRecordsList.find((r) => r.id === deletingId)?.name}
      />
    </div>
  );
}

export default ReportsPage;
