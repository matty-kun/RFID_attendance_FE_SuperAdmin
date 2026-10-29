import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Search, Users } from 'lucide-react';
import { CalendarDatePicker } from '../components/common/CalendarDatePicker';
import { Dropdown } from '../components/common/Dropdown';
import { Button } from '../components/common/Button';
import { request } from '../services/apiClient';
import { adminService } from '../services/adminService';
import type { AdminRecord } from '../types';
import hawi from '../assets/illustrations/Hawi Finding.png';

interface AuditEvent { id: string; occurred_at: string; actor_id: string | null; actor_name: string; action: string; entity_type: string; entity_id: string | null; description: string }
interface AuditPage { records: AuditEvent[]; total: number; page: number; limit: number }
const labelForAction = (action: string) => action === 'attendance.time_in' ? 'Time In Recorded' : action === 'attendance.time_out' ? 'Time Out Recorded' : action.replaceAll('_', ' ').replace('.', ' · ').replace(/\b\w/g, (letter) => letter.toUpperCase());

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
  const [records, setRecords] = useState<AuditEvent[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalServer, setTotalServer] = useState(0);
  const pageSize = 30;

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearchQuery(search.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [attendanceRes, adminsRes, archivedAdminsRes] = await Promise.all([
        request.get<AuditPage>('/audit', { params: { page, limit: pageSize, action: actionFilter, actor_id: userFilter, search: searchQuery, from: startDate, to: endDate } }),
        adminService.getAdmins(1, '', 100).catch(() => ({ admins: [], total: 0, page: 1, limit: 100 })),
        adminService.getAdmins(1, '', 100, true).catch(() => ({ admins: [], total: 0, page: 1, limit: 100 })),
      ]);
      setRecords(attendanceRes.records);
      setTotalServer(attendanceRes.total);
      setAdmins([...adminsRes.admins, ...archivedAdminsRes.admins]);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not load audit log records. Try again.');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, userFilter, searchQuery, startDate, endDate]);

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

  // Historical scans and new management events share one append-only feed.
  const mappedEntries = useMemo(() => {
    return records.map((rec) => {
      const admin = rec.actor_id ? adminMap.get(rec.actor_id) : undefined;
      const adminName = admin?.name || rec.actor_name;
      const isTimeIn = rec.action === 'attendance.time_in';
      const actionLabel = labelForAction(rec.action);
      const badgeClass = isTimeIn ? 'bg-[#E4F7EB] text-[#16883F]' : rec.action === 'attendance.time_out' || rec.action.endsWith('.deleted') ? 'bg-[#FDE8EA] text-[#C52736]' : 'bg-[#F1E9FC] text-[#7025BE]';

      return {
        id: rec.id,
        timestamp: rec.occurred_at,
        user: {
          id: rec.actor_id,
          name: adminName,
          initials: getInitials(adminName),
          avatarUrl: admin?.avatar_url,
        },
        action: rec.action,
        actionLabel,
        badgeClass,
        description: rec.description,
      };
    });
  }, [records, adminMap]);

  const uniqueUsers = useMemo(() => Array.from(new Map([
    ...admins.map((admin) => [admin.id, admin.name] as const),
    ...records.filter((record) => record.actor_id).map((record) => [record.actor_id!, record.actor_name] as const),
  ]).entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)), [admins, records]);

  const filtered = mappedEntries;
  const totalCount = totalServer;
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
            Read-only history of scans and management changes
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-[#756883] transition-all focus-within:border-[#7026B7] focus-within:ring-4 focus-within:ring-purple-100 sm:max-w-[320px]">
          <Search className="h-4 w-4 shrink-0" />
          <span className="sr-only">Search Audit Log</span>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search user, action or record"
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
            setActionFilter(val);
            setPage(1);
          }}
          icon={<Activity className="h-4 w-4 text-[#756883]" />}
          options={[
            { value: 'all', label: 'All Actions' },
            { value: 'attendance.time_in', label: 'Time In Recorded' },
            { value: 'attendance.time_out', label: 'Time Out Recorded' },
            ...Array.from(new Set(records.map((record) => record.action))).filter((action) => !action.startsWith('attendance.')).map((action) => ({ value: action, label: labelForAction(action) })),
          ]}
        />

        {/* User Dropdown Filter */}
        <Dropdown
          value={userFilter}
          onChange={(val) => {
            setUserFilter(val);
            setPage(1);
          }}
          icon={<Users className="h-4 w-4 text-[#756883]" />}
          options={[
            { value: 'all', label: 'All Users' },
            ...uniqueUsers,
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

        <table className="w-full min-w-[640px] text-left text-xs">
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-xs text-[#756883]">
                  <div role="status" className="flex flex-col items-center gap-2"><img src={hawi} alt="" className="mx-auto h-24 w-24 object-contain"/><span>Hawi is checking activity…</span></div>
                </td>
              </tr>
            ) : error && filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-xs text-rose-600">
                  Unable to load audit log records.{' '}
                  <button type="button" onClick={() => void loadData()} className="font-bold underline">
                    Retry
                  </button>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-xs text-[#756883]">
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
                  <td className="whitespace-nowrap px-3.5 py-3.5 text-[12px] text-[#756883] font-medium">
                    {formatTimestamp(entry.timestamp)}
                  </td>

                  {/* User / Admin */}
                  <td className="px-3.5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      {entry.user.avatarUrl ? (
                        <img src={entry.user.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F1E9FC] text-[10px] font-extrabold text-[#7026B7]" aria-hidden="true">
                          {entry.user.initials}
                        </span>
                      )}
                      <span className="font-bold text-[13px] text-[#24133F]">
                        {entry.user.name}
                      </span>
                    </div>
                  </td>

                  {/* Action Pill Badge */}
                  <td className="px-3.5 py-3.5">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${entry.badgeClass}`}
                    >
                      {entry.actionLabel}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="px-3.5 py-3.5 text-[12px] text-[#24133F] font-medium">
                    {entry.description}
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
