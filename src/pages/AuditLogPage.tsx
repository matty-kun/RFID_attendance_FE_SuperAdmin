import { useMemo, useState } from 'react';
import { CalendarDays, Check, Search, UsersRound } from 'lucide-react';
import { isDevPreview } from '../features/auth/devPreview';

type AuditEntry = {
  id: string;
  date: string;
  user: string;
  initials: string;
  action: string;
  description: string;
  record: string;
  tone: string;
};

// Layout samples appear only in the local UI preview. Production needs an audit-log API.
const previewEntries: AuditEntry[] = [
  { id: '1', date: 'Oct 2 · 1:12 PM', user: 'Admin Reyes', initials: 'AR', action: 'Approved attendance', description: 'Afternoon IN for Maria Santos', record: 'ATT-0412', tone: 'bg-[#17B556] text-white' },
  { id: '2', date: 'Oct 2 · 12:58 PM', user: 'Super Admin', initials: 'SA', action: 'Edited schedule', description: 'Day 4 Afternoon IN window changed to 1:00 – 2:00 PM', record: 'SCH-D4-AIN', tone: 'bg-[#E9D7FA] text-[#294B85]' },
  { id: '3', date: 'Oct 2 · 9:40 AM', user: 'Liza Mendoza', initials: 'LM', action: 'Rejected scan', description: 'Duplicate scan for Carlo Reyes', record: 'ATT-0388', tone: 'bg-[#EF3340] text-white' },
  { id: '4', date: 'Oct 1 · 4:05 PM', user: 'Super Admin', initials: 'SA', action: 'Registered RFID', description: 'Card 04 A3 91 7C assigned to Maria Santos', record: 'RFID-0120', tone: 'bg-[#17B556] text-white' },
  { id: '5', date: 'Oct 1 · 8:15 AM', user: 'Super Admin', initials: 'SA', action: 'Disabled admin', description: 'Account disabled for Grace Villanueva', record: 'ADM-004', tone: 'bg-[#E3DFE9] text-[#24133F]' },
  { id: '6', date: 'Sep 30 · 7:31 AM', user: 'Rafael Cortez', initials: 'RC', action: 'Marked not verified', description: 'Unregistered card at Gate A', record: 'ATT-0215', tone: 'bg-[#F59E0B] text-white' },
];

export function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('All Actions');
  const [user, setUser] = useState('All Users');
  const [date, setDate] = useState('All Dates');
  const entries = isDevPreview() ? previewEntries : [];
  const actions = [...new Set(entries.map((entry) => entry.action))];
  const users = [...new Set(entries.map((entry) => entry.user))];
  const filtered = useMemo(() => entries.filter((entry) => {
    const text = `${entry.date} ${entry.user} ${entry.action} ${entry.description} ${entry.record}`.toLowerCase();
    return text.includes(search.toLowerCase())
      && (action === 'All Actions' || entry.action === action)
      && (user === 'All Users' || entry.user === user)
      && (date === 'All Dates' || entry.date.startsWith(date));
  }), [entries, search, action, user, date]);

  return <section aria-labelledby="audit-log-heading" className="mx-auto w-full max-w-[1120px] pt-1 text-[#24133F]">
    <div className="mb-4">
      <h1 id="audit-log-heading" className="text-[28px] font-extrabold leading-tight">Audit Log</h1>
      <p className="text-xs text-[#756883]">Every change and decision, recorded</p>
    </div>

    <div className="mb-2 flex flex-wrap gap-2">
      <label className="flex min-h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-[#756883]">
        <Search className="h-4 w-4 shrink-0" />
        <span className="sr-only">Search audit log</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search audit log" className="w-full bg-transparent text-xs text-[#24133F] outline-none placeholder:text-[#A59AAB]" />
      </label>
      <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs">
        <CalendarDays className="h-4 w-4 text-[#756883]" /><span className="sr-only">Date</span>
        <select value={date} onChange={(event) => setDate(event.target.value)} className="max-w-32 bg-transparent outline-none">
          <option>All Dates</option><option value="Oct 2">Oct 2</option><option value="Oct 1">Oct 1</option><option value="Sep 30">Sep 30</option>
        </select>
      </label>
      <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs">
        <Check className="h-4 w-4 text-[#756883]" /><span className="sr-only">Action</span>
        <select value={action} onChange={(event) => setAction(event.target.value)} className="max-w-36 bg-transparent outline-none">
          <option>All Actions</option>{actions.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs">
        <UsersRound className="h-4 w-4 text-[#756883]" /><span className="sr-only">User</span>
        <select value={user} onChange={(event) => setUser(event.target.value)} className="max-w-32 bg-transparent outline-none">
          <option>All Users</option>{users.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
    </div>

    <div className="overflow-x-auto rounded-b-xl border border-[#E5E0EB] bg-white px-2 pb-6 pt-2 sm:px-3">
      <table className="w-full min-w-[800px] border-separate border-spacing-0 text-left text-xs">
        <thead className="text-[10px] uppercase text-[#637596]">
          <tr className="bg-[#F4F6FA]">
            <th scope="col" className="rounded-l-2xl px-3 py-3 font-medium">Date / Time</th>
            <th scope="col" className="px-3 py-3 font-medium">User / Admin</th>
            <th scope="col" className="px-3 py-3 font-medium">Action</th>
            <th scope="col" className="px-3 py-3 font-medium">Description</th>
            <th scope="col" className="rounded-r-2xl px-3 py-3 font-medium">Related Record</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((entry) => <tr key={entry.id} className="h-[53px]">
            <td className="whitespace-nowrap px-3 text-[11px] text-[#637596]">{entry.date}</td>
            <td className="whitespace-nowrap px-3 font-semibold"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#DFE8F8] text-[10px] text-[#294B85]">{entry.initials}</span>{entry.user}</td>
            <td className="whitespace-nowrap px-3"><span className={`inline-block rounded-xl px-3 py-1.5 text-[11px] font-semibold ${entry.tone}`}>{entry.action}</span></td>
            <td className="px-3 text-[11px]">{entry.description}</td>
            <td className="whitespace-nowrap px-3"><span className="rounded-xl bg-[#F4F6FA] px-2.5 py-1.5 text-[11px] font-semibold text-[#294B85]">{entry.record}</span></td>
          </tr>)}
        </tbody>
      </table>
      {!filtered.length && <div className="px-4 py-14 text-center text-sm text-[#756883]">
        {entries.length ? 'No entries match these filters.' : 'Audit history is not available yet. The backend audit-log API still needs to be connected.'}
      </div>}
    </div>
  </section>;
}
