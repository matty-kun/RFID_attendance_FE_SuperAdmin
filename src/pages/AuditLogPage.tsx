import { useMemo, useState } from 'react';
import { CalendarDays, Search } from 'lucide-react';
import { useAttendanceViewModel } from '../features/attendance/viewmodels/useAttendanceViewModel';
import { isDevPreview } from '../features/auth/devPreview';
import { auditPreviewRecords } from './auditPreviewRecords';

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
  }).format(new Date(timestamp));
}

export function AuditLogPage() {
  const [search, setSearch] = useState('');
  const {
    records, filterType, setFilterType, startDate, setStartDate,
    endDate, setEndDate, page, setPage, total, error, isLoading, refresh,
  } = useAttendanceViewModel(auditPreviewRecords);
  const visibleRecords = useMemo(() => records.filter((record) => {
    const text = [record.student?.name, record.student?.student_id, record.student?.course,
      record.session?.name, record.location?.name, record.type, record.id].join(' ').toLowerCase();
    return text.includes(search.trim().toLowerCase());
  }), [records, search]);
  const pageCount = Math.max(1, Math.ceil(total / 30));

  return <section aria-labelledby="audit-log-heading" className="mx-auto w-full max-w-[1120px] pt-1 text-[#24133F]">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h1 id="audit-log-heading" className="text-[28px] font-extrabold leading-tight">Audit Log</h1><p className="text-xs text-[#756883]">History of every recorded student time in and time out.</p>{isDevPreview() && <p className="mt-1 text-[11px] font-bold text-brand-700">Sample attendance data · UI preview only</p>}</div>
      <button type="button" onClick={() => void refresh()} disabled={isLoading} className="rounded-xl border border-[#E5E0EB] bg-white px-3 py-2 text-xs font-bold text-brand-700 hover:border-brand-700 disabled:opacity-50">Refresh</button>
    </div>
    <div className="mb-2 flex flex-wrap gap-2">
      <label className="flex min-h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-[#756883]">
        <Search className="h-4 w-4 shrink-0" /><span className="sr-only">Search records on this page</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this page" className="w-full bg-transparent text-xs text-[#24133F] outline-none placeholder:text-[#A59AAB]" />
      </label>
      <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs"><CalendarDays className="h-4 w-4 text-[#756883]" />From<input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className="bg-transparent outline-none" /></label>
      <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs">To<input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="bg-transparent outline-none" /></label>
      <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs"><span className="sr-only">Attendance type</span><select value={filterType} onChange={(event) => setFilterType(event.target.value as typeof filterType)} className="bg-transparent outline-none"><option value="all">All Scans</option><option value="time_in">Time In</option><option value="time_out">Time Out</option></select></label>
    </div>
    <div className="overflow-x-auto rounded-xl border border-[#E5E0EB] bg-white px-2 pb-4 pt-2 sm:px-3">
      {error && <p role="alert" className="px-3 py-3 text-sm text-rose-700">{error}</p>}
      <table className="w-full min-w-[800px] border-separate border-spacing-0 text-left text-xs">
        <thead className="text-[10px] uppercase text-[#637596]"><tr className="bg-[#F4F6FA]">
          <th scope="col" className="rounded-l-2xl px-3 py-3 font-medium">Date / Time</th><th scope="col" className="px-3 py-3 font-medium">Student</th><th scope="col" className="px-3 py-3 font-medium">Attendance</th><th scope="col" className="px-3 py-3 font-medium">Session</th><th scope="col" className="rounded-r-2xl px-3 py-3 font-medium">Checkpoint</th>
        </tr></thead>
        <tbody>{visibleRecords.map((record) => <tr key={record.id} className="h-[58px]">
          <td className="whitespace-nowrap px-3 text-[11px] text-[#637596]">{formatTimestamp(record.recorded_at)}</td>
          <td className="px-3"><span className="block font-bold">{record.student?.name ?? 'Unknown student'}</span><span className="text-[10px] text-[#637596]">{record.student?.student_id ?? record.student_id}</span></td>
          <td className="whitespace-nowrap px-3"><span className={`inline-block rounded-xl px-3 py-1.5 text-[11px] font-semibold ${record.type === 'time_in' ? 'bg-[#E4F7EB] text-[#16883F]' : 'bg-[#FDE8EA] text-[#C52736]'}`}>{record.type === 'time_in' ? 'Time In' : 'Time Out'}</span></td>
          <td className="px-3 text-[11px]">{record.session?.name ?? 'Unknown session'}</td><td className="px-3 text-[11px]">{record.location?.name ?? 'Unknown checkpoint'}</td>
        </tr>)}</tbody>
      </table>
      {!visibleRecords.length && <div className="px-4 py-14 text-center text-sm text-[#756883]">{isLoading ? 'Loading attendance history…' : error ? 'Unable to show attendance history.' : search && records.length ? 'No records on this page match your search.' : 'No attendance records found.'}</div>}
      <div className="mt-3 flex items-center justify-between border-t border-[#E5E0EB] px-3 pt-3 text-xs text-[#756883]"><span>{total.toLocaleString()} records · Page {page} of {pageCount}</span><div className="flex gap-2"><button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1 || isLoading} className="rounded-lg border border-[#E5E0EB] px-3 py-1.5 font-bold disabled:opacity-40">Previous</button><button type="button" onClick={() => setPage(page + 1)} disabled={page >= pageCount || isLoading} className="rounded-lg border border-[#E5E0EB] px-3 py-1.5 font-bold disabled:opacity-40">Next</button></div></div>
    </div>
  </section>;
}
