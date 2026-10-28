import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, RefreshCw, Search, Users } from 'lucide-react';
import { CalendarDatePicker } from '../components/common/CalendarDatePicker';
import { Dropdown } from '../components/common/Dropdown';
import { Button } from '../components/common/Button';
import { attendanceService } from '../features/attendance/services';
import { adminService } from '../services/adminService';
import type { AttendanceFilterType, AttendanceRecord } from '../features/attendance/models';
import type { AdminRecord } from '../types';

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Manila' });
  const day = date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Manila' });
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  });
  return `${month} ${day} · ${time}`;
}

function getInitials(fullName: string) {
  return (
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'SA'
  );
}

export function AuditLogPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionFilter, setActionFilter] = useState<AttendanceFilterType>('all');
  const [userFilter, setUserFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalServer, setTotalServer] = useState(0);
  const pageSize = 30;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [attendanceRes, adminsRes] = await Promise.all([
        attendanceService.getRecentAttendance(page, actionFilter, startDate, endDate, pageSize),
        adminService.getAdmins(1, '', 100).catch(() => ({ admins: [], total: 0, page: 1, limit: 100 })),
      ]);
      setRecords(attendanceRes.records);
      setTotalServer(attendanceRes.total);
      setAdmins(adminsRes.admins);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not load audit log records. Try again.');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, startDate, endDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const adminMap = useMemo(() => {
    const map = new Map<string, AdminRecord>();
    for (const admin of admins) {
      map.set(admin.id, admin);
    }
    return map;
  }, [admins]);

  // Transform real attendance records into audit entries
  const mappedEntries = useMemo(() => {
    return records.map((rec) => {
      const admin = adminMap.get(rec.recorded_by);
      const adminName = admin?.name || `Admin (${rec.recorded_by.slice(0, 8)})`;
      const isTimeIn = rec.type === 'time_in';
      const actionLabel = isTimeIn ? 'Time In Recorded' : 'Time Out Recorded';
      const badgeClass = isTimeIn
        ? 'bg-[#10B981] text-white'
        : 'bg-[#EF4444] text-white';
      const studentName = rec.student?.name || 'Student';
      const studentNumber = rec.student?.student_id || rec.student_id.slice(0, 8);
      const sessionName = rec.session?.name || rec.session_id.slice(0, 8);
      const locationName = rec.location?.name || rec.location_id.slice(0, 8);

      return {
        id: rec.id,
        timestamp: rec.recorded_at,
        user: {
          id: rec.recorded_by,
          name: adminName,
          initials: getInitials(adminName),
          avatarBg: isTimeIn ? 'bg-[#DFE8F8]' : 'bg-[#F0E8FC]',
          avatarColor: isTimeIn ? 'text-[#294B85]' : 'text-[#5B21B6]',
        },
        action: rec.type,
        actionLabel,
        badgeClass,
        description: `${studentName} (${studentNumber}) scanned at ${locationName} · ${sessionName}`,
        relatedRecord: studentNumber,
      };
    });
  }, [records, adminMap]);

  const uniqueUsers = useMemo(() => {
    const names = new Set<string>();
    for (const admin of admins) {
      names.add(admin.name);
    }
    for (const entry of mappedEntries) {
      names.add(entry.user.name);
    }
    return Array.from(names).sort();
  }, [admins, mappedEntries]);

  const filtered = useMemo(() => {
    return mappedEntries.filter((record) => {
      if (userFilter !== 'all' && record.user.name !== userFilter) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesDate = formatTimestamp(record.timestamp).toLowerCase().includes(query);
        const matchesUser = record.user.name.toLowerCase().includes(query);
        const matchesAction = record.actionLabel.toLowerCase().includes(query);
        const matchesDesc = record.description.toLowerCase().includes(query);
        const matchesRecord = record.relatedRecord.toLowerCase().includes(query);
        return matchesDate || matchesUser || matchesAction || matchesDesc || matchesRecord;
      }

      return true;
    });
  }, [mappedEntries, userFilter, search]);

  const hasClientFilter = Boolean(search.trim()) || userFilter !== 'all';
  const totalCount = hasClientFilter ? filtered.length : totalServer;
  const pageCount = Math.max(1, Math.ceil(totalServer / pageSize));

  return (
    <section aria-labelledby="audit-log-heading" className="mx-auto w-full max-w-[1120px] pt-1 text-[#24133F]">
      {/* Title & Subtitle */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 id="audit-log-heading" className="text-[26px] font-extrabold leading-tight tracking-tight">
            Audit Log
          </h1>
          <p className="text-xs text-[#756883] mt-0.5">
            Immutable attendance scan records and officer activity
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void loadData()}
          isLoading={loading}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-[#756883] sm:max-w-[320px]">
          <Search className="h-4 w-4 shrink-0" />
          <span className="sr-only">Search Audit Log</span>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search Date, user, action or record"
            className="w-full bg-transparent text-xs text-[#24133F] outline-none placeholder:text-[#A59AAB]"
          />
        </label>

        {/* Calendar Component */}
        <CalendarDatePicker
          startDate={startDate}
          endDate={endDate}
          onChange={(range) => {
            setStartDate(range.startDate);
            setEndDate(range.endDate);
            setPage(1);
          }}
        />

        {/* Action Dropdown Filter */}
        <Dropdown
          value={actionFilter}
          onChange={(val) => {
            setActionFilter(val as AttendanceFilterType);
            setPage(1);
          }}
          icon={<Activity className="h-4 w-4 text-[#756883]" />}
          options={[
            { value: 'all', label: 'All Actions' },
            { value: 'time_in', label: 'Time In Recorded' },
            { value: 'time_out', label: 'Time Out Recorded' },
          ]}
        />

        {/* User Dropdown Filter */}
        <Dropdown
          value={userFilter}
          onChange={(val) => {
            setUserFilter(val);
          }}
          icon={<Users className="h-4 w-4 text-[#756883]" />}
          options={[
            { value: 'all', label: 'All Users' },
            ...uniqueUsers.map((user) => ({ value: user, label: user })),
          ]}
        />
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2.5">
        {error && (
          <div role="alert" className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </span>
            <button type="button" onClick={() => void loadData()} className="underline">
              Retry
            </button>
          </div>
        )}

        <table className="w-full min-w-[760px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
              <th scope="col" className="px-3.5 py-3">
                Date / Time
              </th>
              <th scope="col" className="px-3.5 py-3">
                User / Admin
              </th>
              <th scope="col" className="px-3.5 py-3">
                Action
              </th>
              <th scope="col" className="px-3.5 py-3">
                Description
              </th>
              <th scope="col" className="px-3.5 py-3 text-right sm:text-left">
                Related Record
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-[#756883]">
                  Loading audit log records…
                </td>
              </tr>
            ) : error && filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-rose-600">
                  Unable to load audit log records.{' '}
                  <button type="button" onClick={() => void loadData()} className="font-bold underline">
                    Retry
                  </button>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-[#756883]">
                  {search || startDate || endDate || actionFilter !== 'all' || userFilter !== 'all'
                    ? 'No audit log entries match the selected filters or date range.'
                    : 'No recent activity.'}
                </td>
              </tr>
            ) : (
              filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-[#EEF0F4] last:border-b-0 hover:bg-[#FAF8FC] transition-colors"
                >
                  {/* Date / Time */}
                  <td className="whitespace-nowrap px-3.5 py-3.5 text-[12px] text-[#637596] font-medium">
                    {formatTimestamp(entry.timestamp)}
                  </td>

                  {/* User / Admin */}
                  <td className="px-3.5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                          entry.user.avatarBg
                        } ${entry.user.avatarColor}`}
                        aria-hidden="true"
                      >
                        {entry.user.initials}
                      </span>
                      <span className="font-bold text-[13px] text-[#24133F]">
                        {entry.user.name}
                      </span>
                    </div>
                  </td>

                  {/* Action Pill Badge */}
                  <td className="px-3.5 py-3.5">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold shadow-sm whitespace-nowrap ${entry.badgeClass}`}
                    >
                      {entry.actionLabel}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="px-3.5 py-3.5 text-[12px] text-[#24133F] font-medium max-w-xs">
                    {entry.description}
                  </td>

                  {/* Related Record Badge */}
                  <td className="px-3.5 py-3.5 text-right sm:text-left">
                    <span
                      title={`Audited Entity Reference ID: ${entry.relatedRecord}`}
                      className="inline-block px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-[#334155] font-mono text-[11px] font-bold tracking-tight border border-slate-200/60 select-all cursor-default"
                    >
                      {entry.relatedRecord}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-[#EEF0F4] px-3.5 pt-3 text-xs text-[#756883]">
          <span>
            {totalCount.toLocaleString()} log entries · Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AuditLogPage;
