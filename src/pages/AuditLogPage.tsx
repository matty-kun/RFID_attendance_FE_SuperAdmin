import { useMemo, useState } from 'react';
import { Check, Search, Users } from 'lucide-react';
import { CalendarDatePicker } from '../components/common/CalendarDatePicker';
import { Dropdown } from '../components/common/Dropdown';
import { Button } from '../components/common/Button';
import { auditLogRecords } from './auditPreviewRecords';

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${month} ${day} · ${time}`;
}

export function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('2026-09-29');
  const [endDate, setEndDate] = useState('2026-10-02');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Extract unique actions & users for filters
  const uniqueActions = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of auditLogRecords) {
      map.set(record.action, record.actionLabel);
    }
    return Array.from(map.entries());
  }, []);

  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(auditLogRecords.map((r) => r.user.name))).sort();
  }, []);

  // Filtered entries
  const filtered = useMemo(() => {
    return auditLogRecords.filter((record) => {
      // Date filter
      if (startDate && record.timestamp.slice(0, 10) < startDate) return false;
      if (endDate && record.timestamp.slice(0, 10) > endDate) return false;

      // Action filter
      if (actionFilter !== 'all' && record.action !== actionFilter) return false;

      // User filter
      if (userFilter !== 'all' && record.user.name !== userFilter) return false;

      // Search query
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
  }, [search, startDate, endDate, actionFilter, userFilter]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section aria-labelledby="audit-log-heading" className="mx-auto w-full max-w-[1120px] pt-1 text-[#24133F]">
      {/* Title & Subtitle Matching Figma Mockup */}
      <div className="mb-4">
        <h1 id="audit-log-heading" className="text-[26px] font-extrabold leading-tight tracking-tight">
          Audit Log
        </h1>
        <p className="text-xs text-[#756883] mt-0.5">
          Every change and decision, recorded
        </p>
      </div>

      {/* Filter Bar Matching Figma Mockup */}
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
              setPage(1);
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
            setActionFilter(val);
            setPage(1);
          }}
          icon={<Check className="h-4 w-4" />}
          options={[
            { value: 'all', label: 'All Actions' },
            ...uniqueActions.map(([key, label]) => ({ value: key, label })),
          ]}
        />

        {/* User Dropdown Filter */}
        <Dropdown
          value={userFilter}
          onChange={(val) => {
            setUserFilter(val);
            setPage(1);
          }}
          icon={<Users className="h-4 w-4" />}
          options={[
            { value: 'all', label: 'All Users' },
            ...uniqueUsers.map((user) => ({ value: user, label: user })),
          ]}
        />
      </div>

      {/* Audit Log Table Matching Figma Mockup */}
      <div className="overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-2.5 shadow-sm">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead>
            <tr className="bg-[#F4F6FA] text-[10px] uppercase text-[#637596]">
              <th scope="col" className="rounded-l-xl px-3.5 py-3 font-semibold">
                Date / Time
              </th>
              <th scope="col" className="px-3.5 py-3 font-semibold">
                User / Admin
              </th>
              <th scope="col" className="px-3.5 py-3 font-semibold">
                Action
              </th>
              <th scope="col" className="px-3.5 py-3 font-semibold">
                Description
              </th>
              <th scope="col" className="rounded-r-xl px-3.5 py-3 font-semibold text-right sm:text-left">
                Related Record
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-[#756883]">
                  No audit log entries match the selected filters or date range.
                </td>
              </tr>
            ) : (
              visible.map((entry) => (
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
                          entry.user.avatarBg || 'bg-[#DFE8F8]'
                        } ${entry.user.avatarColor || 'text-[#294B85]'}`}
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
            {total.toLocaleString()} log entries · Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pageCount}
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
