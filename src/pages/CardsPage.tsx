import { useCallback, useEffect, useState } from 'react';
import { ArchiveRestore, CircleAlert, CreditCard, Search, ShieldAlert, UserRound, X } from 'lucide-react';
import { request } from '../services/apiClient';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import hawiLooking from '../assets/illustrations/Hawi Finding.png';

type Status = 'available' | 'issued' | 'lost' | 'damaged';
type Assignment = { id: string; student_id: string | null; student_number: string; student_name: string; issued_at: string; ended_at: string | null; end_reason: string | null };
type Card = { id: string; uid: string; status: Status; created_at: string; holder: Assignment | null };
type Event = { id: string; action: string; student_name: string | null; student_number: string | null; created_at: string; note: string | null; actor?: { name: string } | null };
type Detail = { card: Card; assignments: Assignment[]; events: Event[]; recent_scans: { id: string; type: string; recorded_at: string }[] };
type Student = { id: string; name: string; student_id: string; rfid_uid: string | null };
type Action = 'register' | 'issue' | 'return' | 'lost' | 'damaged' | 'restore';

const statuses: { value: Status | 'all'; label: string }[] = [
  { value: 'all', label: 'All cards' }, { value: 'available', label: 'Available' },
  { value: 'issued', label: 'Issued' }, { value: 'lost', label: 'Lost' }, { value: 'damaged', label: 'Damaged' },
];
const statusStyle: Record<Status, string> = {
  available: 'bg-[#E7F8EE] text-[#087A3A]', issued: 'bg-[#F2E9FC] text-[#7026B7]',
  lost: 'bg-[#FFF0F1] text-[#CE2333]', damaged: 'bg-[#FFF3DC] text-[#9A5900]',
};
const date = (value: string) => new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
const message = (error: unknown) => (error as any)?.response?.data?.error?.message || 'Could not complete this action.';

export function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [uid, setUid] = useState('');
  const [studentId, setStudentId] = useState('');
  const [note, setNote] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await request.get<{ cards: Card[]; total: number }>(`/cards?page=${page}&limit=25&status=${status}&q=${encodeURIComponent(search)}`);
      setCards(result.cards); setTotal(result.total);
    } catch (e) { setError(message(e)); }
    finally { setLoading(false); }
  }, [page, status, search]);
  useEffect(() => { void load(); }, [load]);

  const openDetail = async (card: Card) => {
    setError('');
    try { setDetail(await request.get<Detail>(`/cards/${card.id}`)); }
    catch (e) { setError(message(e)); }
  };
  const openAction = async (next: Action, card?: Card) => {
    setAction(next); setUid(card?.uid ?? ''); setStudentId(''); setNote(''); setError('');
    if (next === 'issue') {
      try {
        const result = await request.get<{ students: Student[] }>('/students?limit=100&archived=false');
        setStudents(result.students.filter(student => !student.rfid_uid));
      } catch (e) { setError(message(e)); }
    }
  };
  const submit = async () => {
    if (!action || !uid.trim()) return;
    setBusy(true); setError('');
    try {
      await request.post(`/cards/${encodeURIComponent(uid.trim())}/actions`, { action, student_id: action === 'issue' ? studentId : undefined, note: note.trim() || undefined });
      setAction(null); setDetail(null); await load();
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto w-full max-w-[1120px] space-y-4 text-[#24133F]">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-[22px] font-extrabold">RFID Cards</h1><p className="text-xs text-[#756883]">Track physical cards, current holders, and every handoff.</p></div>
      <Button leftIcon={<CreditCard className="h-4 w-4" />} onClick={() => void openAction('register')}>Register card</Button>
    </div>
    <div className="flex flex-wrap gap-2">
      <label className="flex h-10 min-w-[230px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 focus-within:border-[#7026B7] focus-within:ring-4 focus-within:ring-purple-100 sm:max-w-[320px]"><Search className="h-4 w-4 text-[#756883]" /><input aria-label="Search card UID" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search card UID" className="w-full bg-transparent text-xs outline-none placeholder:text-[#A59AAB]" /></label>
      <select aria-label="Card status" value={status} onChange={e => { setStatus(e.target.value as Status | 'all'); setPage(1); }} className="h-10 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs font-semibold focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100">{statuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}
    <div className="overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-3">
      {loading ? <div className="flex min-h-56 flex-col items-center justify-center gap-2"><img src={hawiLooking} alt="" className="h-24 w-24 object-contain" /><p className="text-sm text-[#756883]">Looking for cards…</p></div> : cards.length === 0 ? <div className="py-16 text-center text-sm text-[#756883]">No cards match this view.</div> : <table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b border-[#E5E0EB] text-[#756883]"><th className="px-4 py-3 font-semibold">Card UID</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Current holder</th><th className="px-4 py-3 font-semibold">Registered</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead><tbody>{cards.map(card => <tr key={card.id} className="border-b border-[#F1EEF4] last:border-0"><td className="px-4 py-4 font-bold">{card.uid}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 font-bold capitalize ${statusStyle[card.status]}`}>{card.status}</span></td><td className="px-4 py-4">{card.holder ? <><span className="font-semibold">{card.holder.student_name}</span><span className="ml-1 text-[#756883]">{card.holder.student_number}</span></> : <span className="text-[#A59AAB]">—</span>}</td><td className="px-4 py-4 text-[#756883]">{date(card.created_at)}</td><td className="px-4 py-4 text-right"><button onClick={() => void openDetail(card)} className="rounded-xl border border-[#E5E0EB] px-3 py-2 font-bold text-[#7026B7] hover:bg-[#F7F1FD]">View history</button></td></tr>)}</tbody></table>}
    </div>
    {total > 25 && <div className="flex items-center justify-end gap-2 text-xs"><Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {Math.ceil(total / 25)}</span><Button variant="secondary" size="sm" disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>Next</Button></div>}
    <Modal isOpen={Boolean(detail)} onClose={() => setDetail(null)} title={detail ? `Card ${detail.card.uid}` : 'Card history'} description="Permanent ownership and status history" maxWidth="xl">
      {detail && <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6 text-xs">
        <div className="flex items-center justify-between"><span className={`rounded-full px-3 py-1 font-bold capitalize ${statusStyle[detail.card.status]}`}>{detail.card.status}</span><span className="text-[#756883]">{detail.assignments.length} holder{detail.assignments.length === 1 ? '' : 's'} · {detail.recent_scans.length} recent scans</span></div>
        <div className="flex flex-wrap gap-2">{detail.card.status === 'available' && <Button size="sm" onClick={() => void openAction('issue', detail.card)}>Issue card</Button>}{detail.card.status === 'issued' && <Button size="sm" variant="success" onClick={() => void openAction('return', detail.card)}>Return card</Button>}{['available', 'issued'].includes(detail.card.status) && <><Button size="sm" variant="danger" onClick={() => void openAction('lost', detail.card)}>Report lost</Button><Button size="sm" variant="secondary" onClick={() => void openAction('damaged', detail.card)}>Mark damaged</Button></>}{['lost', 'damaged'].includes(detail.card.status) && <Button size="sm" variant="secondary" leftIcon={<ArchiveRestore className="h-3.5 w-3.5" />} onClick={() => void openAction('restore', detail.card)}>Restore to available</Button>}</div>
        <section><h3 className="mb-2 font-bold">Past and current holders</h3><div className="divide-y divide-[#F1EEF4] rounded-xl border border-[#E5E0EB]">{detail.assignments.length ? detail.assignments.map(a => <div key={a.id} className="flex gap-3 p-3"><UserRound className="h-4 w-4 text-[#7026B7]" /><div><b>{a.student_name}</b> · {a.student_number}<p className="mt-1 text-[#756883]">Issued {date(a.issued_at)} · {a.ended_at ? `${a.end_reason} ${date(a.ended_at)}` : 'Current holder'}</p></div></div>) : <p className="p-3 text-[#756883]">No holder yet.</p>}</div></section>
        <section><h3 className="mb-2 font-bold">Card activity</h3><div className="divide-y divide-[#F1EEF4] rounded-xl border border-[#E5E0EB]">{detail.events.map(event => <div key={event.id} className="p-3"><b className="capitalize">{event.action}</b>{event.student_name && ` · ${event.student_name} (${event.student_number})`}<p className="mt-1 text-[#756883]">{date(event.created_at)}{event.actor?.name && ` · ${event.actor.name}`}{event.note && ` · ${event.note}`}</p></div>)}</div></section>
        {detail.recent_scans.length > 0 && <section><h3 className="mb-2 font-bold">Recent scans</h3><p className="text-[#756883]">{detail.recent_scans.map(scan => `${scan.type === 'time_in' ? 'Time in' : 'Time out'} · ${date(scan.recorded_at)}`).join('  |  ')}</p></section>}
      </div>}
    </Modal>
    <Modal isOpen={Boolean(action)} onClose={() => !busy && setAction(null)} title={action === 'register' ? 'Register RFID card' : action === 'issue' ? 'Issue RFID card' : action === 'return' ? 'Return RFID card' : action === 'lost' ? 'Report lost card' : action === 'damaged' ? 'Mark damaged card' : 'Restore RFID card'} description="Card history stays available for auditing." maxWidth="md">
      <div className="space-y-4 p-6 text-xs"><div className="flex justify-center">{action === 'lost' ? <ShieldAlert className="h-12 w-12 text-[#EF3340]" /> : action === 'damaged' ? <CircleAlert className="h-12 w-12 text-[#F59E0B]" /> : <img src={hawiLooking} alt="" className="h-20 w-20 object-contain" />}</div>
        <label className="block font-semibold">Card UID<input value={uid} onChange={e => setUid(e.target.value)} disabled={action !== 'register'} className="mt-1 block h-10 w-full rounded-xl border border-[#E5E0EB] px-3 focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100 disabled:bg-[#F7F6F9]" /></label>
        {action === 'issue' && <label className="block font-semibold">Student<select value={studentId} onChange={e => setStudentId(e.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-[#E5E0EB] px-3 focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100"><option value="">Choose student</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} · {s.student_id}</option>)}</select></label>}
        {action !== 'issue' && action !== 'register' && <label className="block font-semibold">Note (optional)<input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Reason or handoff detail" className="mt-1 block h-10 w-full rounded-xl border border-[#E5E0EB] px-3 focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100" /></label>}
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-[#F1EEF4] pt-4"><Button variant="secondary" onClick={() => setAction(null)} disabled={busy} leftIcon={<X className="h-4 w-4" />}>Cancel</Button><Button variant={action === 'lost' ? 'danger' : 'primary'} onClick={() => void submit()} isLoading={busy} disabled={!uid.trim() || action === 'issue' && !studentId}>{action === 'register' ? 'Register card' : action === 'issue' ? 'Issue card' : action === 'return' ? 'Confirm return' : action === 'lost' ? 'Report lost' : action === 'damaged' ? 'Mark damaged' : 'Restore card'}</Button></div>
      </div>
    </Modal>
  </div>;
}
