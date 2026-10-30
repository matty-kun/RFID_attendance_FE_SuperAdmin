import { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Check, CircleAlert, CreditCard, ExternalLink, Filter, Hash, Loader2, Radio, RotateCcw, Search, ShieldAlert, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatYearLevel } from '../utils/formatters';
import { request } from '../services/apiClient';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import { Dropdown } from '../components/common/Dropdown';
import { useToast } from '../context';
import hawiLooking from '../assets/illustrations/Hawi Finding.png';
import hawiScanning from '../assets/illustrations/Hawi Tap Card.png';
import hawiCard from '../assets/illustrations/Hawi Card.png';
import hawiCrying from '../assets/illustrations/Hawi Crying.png';
import hawiBox from '../assets/illustrations/Hawi Box.png';
import hawiCheck from '../assets/illustrations/Hawi Check.png';
import hawiBrokenCard from '../assets/illustrations/Hawi Broken Card.png';

type Status = 'available' | 'issued' | 'lost' | 'damaged' | 'archived';
type Assignment = { id: string; student_id: string | null; student_number: string; student_name: string; issued_at: string; ended_at: string | null; end_reason: string | null; avatar_url?: string | null; course?: string | null; year_level?: number | null };
type Card = { id: string; uid: string; card_number: string; status: Status; created_at: string; holder: Assignment | null };
type CardSummary = { available: number; issued: number; lost_or_damaged: number };
type Event = { id: string; action: string; student_name: string | null; student_number: string | null; created_at: string; note: string | null; actor?: { name: string } | null };
type Detail = { card: Card; assignments: Assignment[]; events: Event[]; recent_scans: { id: string; type: string; recorded_at: string; student_id: string | null }[] };
type Student = { id: string; name: string; student_id: string; rfid_uid: string | null };
type Action = 'register' | 'issue' | 'return' | 'lost' | 'damaged' | 'restore' | 'archive' | 'unarchive';

const statuses: { value: Status | 'all'; label: string }[] = [
  { value: 'all', label: 'All cards' }, { value: 'available', label: 'Available' },
  { value: 'issued', label: 'Issued' }, { value: 'lost', label: 'Lost' }, { value: 'damaged', label: 'Damaged' }, { value: 'archived', label: 'Archived' },
];
const statusStyle: Record<Status, string> = {
  available: 'bg-[#E7F8EE] text-[#087A3A]', issued: 'bg-[#F2E9FC] text-[#7026B7]',
  lost: 'bg-[#FFF0F1] text-[#CE2333]', damaged: 'bg-[#FFF3DC] text-[#9A5900]', archived: 'bg-[#F1EEF4] text-[#756883]',
};
const date = (value: string) => new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
const message = (error: unknown) => (error as any)?.response?.data?.error?.message || 'Could not complete this action.';

export function CardsPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<CardSummary | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailReady, setDetailReady] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [detailError, setDetailError] = useState('');
  const detailRequest = useRef(0);
  const [action, setAction] = useState<Action | null>(null);
  const lastAction = useRef<Action>('register');
  if (action) lastAction.current = action;
  const [uid, setUid] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const [studentId, setStudentId] = useState('');
  const [note, setNote] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [busy, setBusy] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [inspectUid, setInspectUid] = useState('');
  const [inspecting, setInspecting] = useState(false);
  useEffect(() => {
    const open = () => setInspectOpen(true);
    window.addEventListener('presnt:open-card-inspector', open);
    return () => window.removeEventListener('presnt:open-card-inspector', open);
  }, []);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const result = await request.get<{ cards: Card[]; total: number }>(`/cards?page=${page}&limit=25&status=${status}&q=${encodeURIComponent(search)}`);
      setCards(result.cards); setTotal(result.total);
    } catch (e) { showToast(message(e), 'error'); }
    finally { if (showLoading) setLoading(false); }
  }, [page, status, search]);
  useEffect(() => { void load(); }, [load]);
  const loadSummary = useCallback(async () => {
    try { setSummary(await request.get<CardSummary>('/cards/summary')); }
    catch (e) { showToast(message(e), 'error'); }
  }, [showToast]);
  useEffect(() => { void loadSummary(); }, [loadSummary]);

  const openDetail = async (card: Card) => {
    const requestId = ++detailRequest.current;
    setSelectedCard(card);
    setDetail({ card, assignments: card.holder ? [card.holder] : [], events: [], recent_scans: [] });
    setDetailReady(false);
    setDetailError('');
    try {
      const result = await request.get<Detail>(`/cards/${card.id}`);
      if (detailRequest.current === requestId) { setDetail(result); setDetailReady(true); }
    } catch (e) {
      if (detailRequest.current === requestId) { setDetailError(message(e)); showToast(message(e), 'error'); }
    }
  };
  const closeDetail = () => { detailRequest.current += 1; setSelectedCard(null); setDetail(null); };
  const inspectCard = async () => {
    const scanned = inspectUid.trim();
    if (!scanned || inspecting) return;
    setInspecting(true);
    try {
      const result = await request.get<{ card: Card | null }>(`/cards/lookup/${encodeURIComponent(scanned)}`);
      const card = result.card;
      setInspectOpen(false);
      setInspectUid('');
      if (card) void openDetail(card);
      else { await openAction('register'); setUid(scanned); showToast('Card not registered yet. Enter its printed number to register it.', 'info'); }
    } catch (e) { showToast(message(e), 'error'); }
    finally { setInspecting(false); }
  };
  const openAction = async (next: Action, card?: Card) => {
    setAction(next); setUid(card?.uid ?? ''); setCardNumber(card?.card_number ?? ''); setRegisterStep(1); setStudentId(''); setNote('');
    if (next === 'issue') {
      try {
        const result = await request.get<{ students: Student[] }>('/students?limit=100&archived=false');
        setStudents(result.students.filter(student => !student.rfid_uid));
      } catch (e) { showToast(message(e), 'error'); }
    }
  };
  const submit = async () => {
    if (!action || !uid.trim() || (action === 'register' && !cardNumber.trim())) return;
    setBusy(true);
    try {
      await request.post(`/cards/${encodeURIComponent(uid.trim())}/actions`, { action, student_id: action === 'issue' ? studentId : undefined, note: note.trim() || undefined, card_number: action === 'register' ? cardNumber.trim() : undefined });
      setAction(null); closeDetail(); showToast(action === 'register' ? 'RFID card registered.' : 'Card updated.', 'success'); await Promise.all([load(false), loadSummary()]);
    } catch (e) { showToast(message(e), 'error'); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto w-full max-w-[1120px] space-y-4 text-[#24133F]">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-[22px] font-extrabold">RFID Cards</h1><p className="text-xs text-[#756883]">Track physical cards, current holders, and every handoff.</p></div>
      <div className="flex gap-2"><Button variant="secondary" leftIcon={<Radio className="h-4 w-4" />} onClick={() => setInspectOpen(true)}>Inspect card</Button><Button leftIcon={<CreditCard className="h-4 w-4" />} onClick={() => void openAction('register')}>Register card</Button></div>
    </div>
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-[#E5E0EB] bg-white sm:grid-cols-3" aria-label="Card inventory summary">
      <div className="px-5 py-4 sm:border-r sm:border-[#E5E0EB]"><p className="text-xs text-[#756883]">Available cards</p><p className="mt-1 text-2xl font-extrabold">{summary?.available ?? '—'}</p><p className="mt-0.5 text-xs text-[#A59AAB]">Ready to issue</p></div>
      <div className="border-t border-[#E5E0EB] px-5 py-4 sm:border-r sm:border-t-0"><p className="text-xs text-[#756883]">Issued cards</p><p className="mt-1 text-2xl font-extrabold text-[#7026B7]">{summary?.issued ?? '—'}</p><p className="mt-0.5 text-xs text-[#A59AAB]">Currently with students</p></div>
      <div className="border-t border-[#E5E0EB] px-5 py-4 sm:border-t-0"><p className="text-xs text-[#756883]">Lost or damaged</p><p className="mt-1 text-2xl font-extrabold text-[#C24139]">{summary?.lost_or_damaged ?? '—'}</p><p className="mt-0.5 text-xs text-[#A59AAB]">Unavailable for issue</p></div>
    </div>
    <div className="flex flex-wrap gap-2">
      <label className="flex h-10 min-w-[230px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 focus-within:border-[#7026B7] focus-within:ring-4 focus-within:ring-purple-100 sm:max-w-[320px]"><Search className="h-4 w-4 text-[#756883]" /><input aria-label="Search card number or UID" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search card number or UID" className="w-full bg-transparent text-xs outline-none placeholder:text-[#A59AAB]" /></label>
      <Dropdown value={status} onChange={value => { setStatus(value as Status | 'all'); setPage(1); }} options={statuses} icon={<Filter className="h-4 w-4" />} buttonClassName="min-w-[150px]" />
    </div>
    <div className="overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-3">
      {loading ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><img src={hawiLooking} alt="" className="mb-3 h-28 w-28 object-contain" /><div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-[#7026B7]" /><p className="text-sm font-bold text-[#24133F]">Loading cards…</p></div><p className="mt-1 text-xs text-[#756883]">Finding registered cards and their current holders.</p></div> : cards.length === 0 ? <div className="py-16 text-center text-sm text-[#756883]">No cards match this view.</div> : <table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="border-b border-[#E5E0EB] text-[#756883]"><th className="px-4 py-3 font-semibold">Card No.</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Current holder</th><th className="px-4 py-3 font-semibold">Registered</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead><tbody>{cards.map(card => <tr key={card.id} className="border-b border-[#F1EEF4] last:border-0"><td className="px-4 py-4"><p className="font-bold text-[#24133F]">{card.card_number}</p><p className="mt-0.5 font-mono text-[10px] text-[#756883]">UID {card.uid}</p></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 font-bold capitalize ${statusStyle[card.status]}`}>{card.status}</span></td><td className="px-4 py-4">{card.holder ? <div className="flex items-center gap-2.5">{card.holder.avatar_url ? <img src={card.holder.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2E9FC] text-[10px] font-bold text-[#7026B7]">{card.holder.student_name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>}<span><span className="block font-semibold">{card.holder.student_name}</span><span className="text-[#756883]">{card.holder.student_number}</span></span></div> : <span className="text-[#A59AAB]">No current holder</span>}</td><td className="px-4 py-4 text-[#756883]">{date(card.created_at)}</td><td className="px-4 py-4 text-right"><button onClick={() => void openDetail(card)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">View History →</button></td></tr>)}</tbody></table>}
    </div>
    {total > 25 && <div className="flex items-center justify-end gap-2 text-xs"><Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {Math.ceil(total / 25)}</span><Button variant="secondary" size="sm" disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>Next</Button></div>}
    <Drawer isOpen={Boolean(selectedCard)} onClose={closeDetail} title={selectedCard?.card_number ?? 'Card history'} maxWidth="2xl" hideHeader noPadding>
      {detail && <div className="min-h-full bg-white text-xs text-[#24133F]"><div className="bg-gradient-to-b from-[#9333EA] via-[#C084FC] via-[#F3E8FF] to-white px-7 pb-10 pt-6"><div className="flex items-start justify-between"><h2 className="text-2xl font-black text-white">{detail.card.card_number}</h2><div className="flex gap-2"><button type="button" disabled={!['available', 'archived'].includes(detail.card.status)} onClick={() => void openAction(detail.card.status === 'archived' ? 'unarchive' : 'archive', detail.card)} aria-label={detail.card.status === 'archived' ? 'Restore archived card' : 'Archive card'} title={detail.card.status === 'issued' ? 'Return the card before archiving' : detail.card.status === 'archived' ? 'Restore archived card' : detail.card.status === 'available' ? 'Archive card' : 'Restore the card before archiving'} className="rounded-2xl border border-white/30 bg-white/20 p-2.5 text-white hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50">{detail.card.status === 'archived' ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />}</button><button type="button" onClick={closeDetail} aria-label="Close card history" className="rounded-2xl border border-white/30 bg-white/20 p-2.5 text-white hover:bg-white/30"><X className="h-5 w-5" /></button></div></div><div className="mt-2 flex justify-center"><div className="relative h-72 w-72 sm:h-80 sm:w-80"><img src={hawiCard} alt="" className="h-full w-full object-contain" /><span className="absolute left-[32%] top-[72%] -rotate-1 whitespace-nowrap font-sans text-sm font-black tracking-wide text-[#24133F] sm:text-base">{detail.card.card_number.replace(/^RFID-/, '')}</span></div></div></div><div className="space-y-6 px-7 pb-10">
        <div className="border-b border-[#F1EEF4] pb-5"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#A59AAB]">Card UID</p><div className="flex items-center justify-between gap-3"><p className="font-mono text-sm font-bold">{detail.card.uid}</p><span className={`rounded-full px-3 py-1 font-bold capitalize ${statusStyle[detail.card.status]}`}>{detail.card.status}</span></div><div className="mt-4 flex flex-wrap gap-2 [&>button]:flex-1 [&>button]:justify-center [&>button]:whitespace-nowrap">{detail.card.status === 'available' && <Button size="sm" leftIcon={<CreditCard className="h-4 w-4" />} onClick={() => void openAction('issue', detail.card)}>Issue card</Button>}{detail.card.status === 'issued' && <Button size="sm" variant="success" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => void openAction('return', detail.card)}>Return card</Button>}{['available', 'issued'].includes(detail.card.status) && <><Button size="sm" variant="danger" leftIcon={<ShieldAlert className="h-4 w-4" />} onClick={() => void openAction('lost', detail.card)}>Report lost</Button><Button size="sm" variant="secondary" leftIcon={<CircleAlert className="h-4 w-4" />} onClick={() => void openAction('damaged', detail.card)}>Mark damaged</Button></>}{['lost', 'damaged'].includes(detail.card.status) && <Button size="sm" variant="secondary" leftIcon={<ArchiveRestore className="h-4 w-4" />} onClick={() => void openAction('restore', detail.card)}>Restore to available</Button>}</div></div>
        {(detail.assignments.length > 0 || detailReady) && <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#A59AAB]">{detailReady ? `Holder history · ${detail.assignments.length}` : 'Current holder'}</h3><div className="space-y-3">{detail.assignments.length ? detail.assignments.map(a => { const scans = detail.recent_scans.filter(scan => scan.student_id === a.student_id && scan.recorded_at >= a.issued_at && (!a.ended_at || scan.recorded_at <= a.ended_at)); return <div key={a.id} className="overflow-hidden rounded-2xl border border-[#E5E0EB]"><div className="flex flex-wrap items-center gap-3 p-4">{a.avatar_url ? <img src={a.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F2E9FC]"><UserRound className="h-5 w-5 text-[#7026B7]" /></span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-base">{a.student_name}</b><span className="rounded-full bg-[#F7F1FD] px-2 py-0.5 font-bold text-[#7026B7]">@{a.student_number}</span>{!a.ended_at && <span className="rounded-full bg-[#E7F8EE] px-2 py-0.5 font-bold text-[#087A3A]">Current</span>}</div>{a.course && <p className="mt-0.5 text-[#756883]">{a.course}{a.year_level ? ` · ${formatYearLevel(a.year_level)}` : ''}</p>}<p className="mt-1 text-[#756883]">Issued {date(a.issued_at)}{a.ended_at ? ` · ${a.end_reason} ${date(a.ended_at)}` : ''}</p></div>{a.student_id && <Button size="sm" leftIcon={<ExternalLink className="h-3.5 w-3.5" />} onClick={() => navigate(`/students?profile=${encodeURIComponent(a.student_number)}`)}>View Profile</Button>}</div>{detailReady && <div className="border-t border-[#F1EEF4] bg-[#FAF8FC] px-4 py-3"><p className="mb-2 font-bold text-[#756883]">Scans with this card</p>{scans.length ? <div className="space-y-2">{scans.map(scan => <div key={scan.id} className="flex justify-between gap-3"><span className="font-semibold">{scan.type === 'time_in' ? 'Time in' : 'Time out'}</span><time className="text-[#756883]">{date(scan.recorded_at)}</time></div>)}</div> : <p className="text-[#756883]">No scans recorded while this student held the card.</p>}</div>}</div>; }) : <p className="rounded-2xl border border-[#E5E0EB] p-4 text-[#756883]">No holder yet.</p>}</div></section>}
        {detailError && selectedCard && <Button size="sm" onClick={() => void openDetail(selectedCard)}>Retry history</Button>}
        {detailReady && <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#A59AAB]">Card activity</h3><div className="divide-y divide-[#F1EEF4] rounded-2xl border border-[#E5E0EB]">{detail.events.map(event => <div key={event.id} className="p-4"><b className="text-sm capitalize">{event.action}</b>{event.student_name && ` · ${event.student_name} (${event.student_number})`}<p className="mt-1 text-[#756883]">{date(event.created_at)}{event.actor?.name && ` · ${event.actor.name}`}{event.note && ` · ${event.note}`}</p></div>)}</div></section>}
      </div></div>}
    </Drawer>
    <Modal isOpen={inspectOpen} onClose={() => !inspecting && setInspectOpen(false)} title="Inspect RFID card" description="Tap a card to find its status, holder, and history." maxWidth="md">
      <div className="space-y-4 p-6 text-xs"><div className="flex justify-center"><img src={hawiScanning} alt="" className="h-28 w-28 object-contain" /></div><label className="block font-semibold">Scan card UID<div className="relative mt-2"><Radio className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#756883]" /><input autoFocus value={inspectUid} onChange={event => setInspectUid(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void inspectCard(); } }} placeholder="Tap or scan card now" className="h-10 w-full rounded-xl border border-[#E5E0EB] pl-9 pr-3 focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100" /></div></label><div className="flex justify-end gap-2 border-t border-[#F1EEF4] pt-4"><Button variant="secondary" onClick={() => setInspectOpen(false)} disabled={inspecting}>Cancel</Button><Button onClick={() => void inspectCard()} disabled={!inspectUid.trim()} isLoading={inspecting}>Inspect card</Button></div></div>
    </Modal>
    <Modal isOpen={Boolean(action)} onClose={() => !busy && setAction(null)} title={action === 'register' ? 'Register RFID card' : action === 'issue' ? 'Issue RFID card' : action === 'return' ? 'Return RFID card' : action === 'lost' ? 'Report lost card' : action === 'damaged' ? 'Mark damaged card' : action === 'archive' ? 'Archive RFID card' : action === 'unarchive' ? 'Restore archived card' : 'Restore RFID card'} description={action === 'register' ? 'Scan the card, then enter its printed number.' : action === 'archive' ? 'Remove this card from circulation. Its history stays available.' : action === 'unarchive' ? 'Make this card available to issue again.' : 'Card history stays available for auditing.'} maxWidth="md">
      <div className="space-y-4 p-6 text-xs">{action === 'register' && <div className="relative mb-5 flex items-start justify-between px-8" aria-label={`Step ${registerStep} of 2`}><div className="absolute left-[25%] right-[25%] top-4 h-[2px] bg-[#E5E0EB]" /><div className={`absolute left-[25%] top-4 h-[2px] bg-[#A855F7] transition-all ${registerStep === 2 ? 'w-1/2' : 'w-0'}`} />{(['Scan card', 'Card number'] as const).map((title, index) => <div key={title} className="relative z-10 flex w-24 flex-col items-center gap-2 text-center"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${registerStep === index + 1 ? 'bg-[#A855F7] text-white ring-4 ring-[#A855F7]/25' : registerStep > index + 1 ? 'bg-[#A855F7] text-white' : 'bg-[#F3E8FF] text-[#A855F7]'}`}>{registerStep > index + 1 ? <Check className="h-4 w-4" /> : index + 1}</span><span className={registerStep === index + 1 ? 'font-bold text-[#24133F]' : 'text-[#756883]'}>{title}</span></div>)}</div>}
        <div className="flex justify-center"><img src={lastAction.current === 'damaged' ? hawiBrokenCard : lastAction.current === 'lost' ? hawiCrying : lastAction.current === 'archive' ? hawiBox : lastAction.current === 'restore' || lastAction.current === 'unarchive' ? hawiCheck : lastAction.current === 'return' || lastAction.current === 'issue' || lastAction.current === 'register' ? hawiScanning : hawiLooking} alt="" className="h-24 w-24 object-contain" /></div>
        {(action !== 'register' || registerStep === 1) && <label className="block font-semibold">{action === 'register' ? 'Scan card UID' : 'Card UID'}<div className="relative mt-1"><Radio className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7026B7]" /><input value={uid} onChange={e => setUid(e.target.value)} onKeyDown={e => { if (action === 'register' && e.key === 'Enter') { e.preventDefault(); if (uid.trim()) { setRegisterStep(2); requestAnimationFrame(() => cardNumberRef.current?.focus()); } } }} disabled={action !== 'register'} autoFocus={action === 'register'} placeholder={action === 'register' ? 'Tap or scan card now' : undefined} className="block h-10 w-full rounded-xl border border-[#E5E0EB] py-0 pl-9 pr-3 focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100 disabled:bg-[#F7F6F9]" /></div></label>}
        {action === 'register' && registerStep === 2 && <><div className="flex items-center justify-between rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] px-4 py-3"><span className="font-semibold text-[#756883]">Card scanned</span><span className="font-mono font-bold text-[#24133F]">{uid.trim()}</span></div><label className="block font-semibold text-[#24133F]">Printed Card No.<div className="relative mt-1.5"><Hash className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7026B7]" /><input ref={cardNumberRef} value={cardNumber} onChange={e => setCardNumber(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!busy) void submit(); } }} placeholder="e.g. RFID-001" maxLength={32} className="block h-10 w-full rounded-xl border border-[#E5E0EB] py-0 pl-9 pr-3 uppercase focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100" /></div><span className="mt-1.5 block font-normal text-[#756883]">Enter the number printed on this card.</span></label></>}
        {action === 'issue' && <label className="block font-semibold">Student<select value={studentId} onChange={e => setStudentId(e.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-[#E5E0EB] px-3 focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100"><option value="">Choose student</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} · {s.student_id}</option>)}</select></label>}
        {action !== 'issue' && action !== 'register' && action !== 'archive' && action !== 'unarchive' && <label className="block font-semibold">Note (optional)<input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Reason or handoff detail" className="mt-1 block h-10 w-full rounded-xl border border-[#E5E0EB] px-3 focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100" /></label>}
        <div className={`flex gap-2 border-t border-[#F1EEF4] pt-4 ${action === 'register' ? 'justify-between' : 'justify-end'}`}><Button variant="secondary" onClick={() => action === 'register' && registerStep === 2 ? setRegisterStep(1) : setAction(null)} disabled={busy} leftIcon={action === 'register' ? undefined : <X className="h-4 w-4" />}>{action === 'register' && registerStep === 2 ? 'Back' : 'Cancel'}</Button><Button variant={action === 'lost' ? 'danger' : 'primary'} onClick={() => { if (action === 'register' && registerStep === 1) { setRegisterStep(2); requestAnimationFrame(() => cardNumberRef.current?.focus()); } else void submit(); }} isLoading={busy} disabled={!uid.trim() || action === 'register' && registerStep === 2 && !cardNumber.trim() || action === 'issue' && !studentId}>{action === 'register' ? registerStep === 1 ? 'Next →' : 'Register card' : action === 'issue' ? 'Issue card' : action === 'return' ? 'Confirm return' : action === 'lost' ? 'Report lost' : action === 'damaged' ? 'Mark damaged' : action === 'archive' ? 'Archive card' : action === 'unarchive' ? 'Restore card' : 'Restore card'}</Button></div>
      </div>
    </Modal>
  </div>;
}
