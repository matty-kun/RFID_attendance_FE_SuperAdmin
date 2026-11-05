import { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Check, CheckCircle2, CircleAlert, Clock, CreditCard, ExternalLink, FileText, Filter, Loader2, Pencil, Radio, RotateCcw, Search, ShieldAlert, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';
import { formatYearLevel } from '../utils/formatters';
import { soundManager } from '../utils/audioFeedback';
import { request } from '../services/apiClient';
import { Button } from '../components/common/Button';
import { CardRegisterActionsDropdown } from '../components/cards/CardRegisterActionsDropdown';
import { StudentProfileDrawer } from '../features/students/views/StudentProfileDrawer';
import { studentService } from '../features/students/services/studentService';
import type { StudentRecord } from '../features/students/models';
import { Modal } from '../components/common/Modal';
import { Checkbox } from '../components/common/Checkbox';
import { Drawer } from '../components/common/Drawer';
import { Dropdown } from '../components/common/Dropdown';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { useToast } from '../context';
import hawiLooking from '../assets/illustrations/Hawi Finding.png';
import hawiScanning from '../assets/illustrations/Hawi Tap Card.png';
import hawiCard from '../assets/illustrations/Hawi Card.png';
import hawiCrying from '../assets/illustrations/Hawi Crying.png';
import hawiBox from '../assets/illustrations/Hawi Box.png';
import hawiCheck from '../assets/illustrations/Hawi Check.png';
import hawiBrokenCard from '../assets/illustrations/Hawi Broken Card.png';
import hawiTrash from '../assets/illustrations/Hawi Trash Can.png';

type Status = 'available' | 'issued' | 'lost' | 'damaged' | 'archived';
type Assignment = { id: string; student_id: string | null; student_number: string; student_name: string; issued_at: string; ended_at: string | null; end_reason: string | null; avatar_url?: string | null; course?: string | null; year_level?: number | null };
type Card = { id: string; uid: string; card_number: string; status: Status; created_at: string; holder: Assignment | null };
type CardSummary = { available: number; issued: number; lost_or_damaged: number };
type Event = { id: string; action: string; student_name: string | null; student_number: string | null; created_at: string; note: string | null; actor?: { name: string } | null };
type CardScan = {
  id: string;
  type: string;
  recorded_at: string;
  student_id: string | null;
  session_name?: string | null;
  session_date?: string | null;
  event_name?: string | null;
  location_name?: string | null;
  time_window?: string | null;
};
type Detail = { card: Card; assignments: Assignment[]; events: Event[]; recent_scans: CardScan[] };
type Student = {
  id: string;
  name: string;
  student_id: string;
  rfid_uid: string | null;
  course?: string | null;
  year_level?: number | null;
  avatar_url?: string | null;
};
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
  const activeAction = action || lastAction.current;
  const [uid, setUid] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const [studentId, setStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [note, setNote] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [busy, setBusy] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [isEditingCardNumber, setIsEditingCardNumber] = useState(false);
  const [editCardNumber, setEditCardNumber] = useState('');
  const [savingCardNumber, setSavingCardNumber] = useState(false);
  const [editCardNumberError, setEditCardNumberError] = useState('');
  const [registerCardNumberError, setRegisterCardNumberError] = useState('');
  const [isContinuousRegister, setIsContinuousRegister] = useState(true);
  const [sessionRegisteredCount, setSessionRegisteredCount] = useState(0);
  const [lastRegisteredCard, setLastRegisteredCard] = useState<string | null>(null);
  const registerUidInputRef = useRef<HTMLInputElement>(null);
  const [inspectUid, setInspectUid] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [singleDeleteConfirmation, setSingleDeleteConfirmation] = useState('');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<StudentRecord | null>(null);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  const handleViewStudentProfile = async (a: Assignment) => {
    try {
      const res = await studentService.getStudents(1, a.student_number, 'created_at', 'desc', 10, false);
      let matched = res.students.find(s => s.id === a.student_id || s.student_id === a.student_number);
      if (!matched) {
        const archivedRes = await studentService.getStudents(1, a.student_number, 'created_at', 'desc', 10, true);
        matched = archivedRes.students.find(s => s.id === a.student_id || s.student_id === a.student_number);
      }
      if (matched) {
        setSelectedStudentForProfile(matched);
      } else {
        setSelectedStudentForProfile({
          id: a.student_id || '',
          student_id: a.student_number,
          name: a.student_name,
          course: a.course || '',
          year_level: a.year_level || 1,
          rfid_uid: a.ended_at ? null : detail?.card.uid || null,
          card_number: a.ended_at ? null : detail?.card.card_number || null,
          avatar_url: a.avatar_url || null,
          created_at: a.issued_at,
          updated_at: a.issued_at,
        });
      }
      setIsProfileDrawerOpen(true);
    } catch {
      setSelectedStudentForProfile({
        id: a.student_id || '',
        student_id: a.student_number,
        name: a.student_name,
        course: a.course || '',
        year_level: a.year_level || 1,
        rfid_uid: a.ended_at ? null : detail?.card.uid || null,
        card_number: a.ended_at ? null : detail?.card.card_number || null,
        avatar_url: a.avatar_url || null,
        created_at: a.issued_at,
        updated_at: a.issued_at,
      });
      setIsProfileDrawerOpen(true);
    }
  };
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [pendingBulkAction, setPendingBulkAction] = useState<'archive' | 'unarchive' | 'delete' | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const isSingleDeleteConfirmed =
    singleDeleteConfirmation.trim().replace(/^"|"$/g, '').toUpperCase() === 'DELETE';
  const isBulkDeleteConfirmed =
    deleteConfirmation.trim().replace(/^"|"$/g, '').toUpperCase() === 'DELETE';

  useEffect(() => {
    setSelectedCardIds([]);
  }, [page, status, search]);

  const selectedCards = cards.filter(c => selectedCardIds.includes(c.id));
  const allVisibleSelected = cards.length > 0 && cards.every(c => selectedCardIds.includes(c.id));
  const selectedWithHistory = selectedCards.filter(c => c.status === 'issued' || c.holder !== null);
  const canBulkDelete = selectedCards.length > 0 && selectedWithHistory.length === 0;
  const canBulkArchive = selectedCards.some(c => c.status === 'available');
  const canBulkRestore = selectedCards.some(c => c.status === 'archived');

  const runBulkAction = async () => {
    if (!pendingBulkAction || bulkBusy) return;
    setBulkBusy(true);

    try {
      if (pendingBulkAction === 'archive') {
        const eligible = selectedCards.filter(c => c.status === 'available');
        let successCount = 0;
        for (const card of eligible) {
          try {
            await request.post(`/cards/${encodeURIComponent(card.uid)}/actions`, { action: 'archive' });
            successCount++;
          } catch {
            // continue
          }
        }
        showToast(`Archived ${successCount} of ${eligible.length} selected cards.`, successCount > 0 ? 'success' : 'error');
      } else if (pendingBulkAction === 'unarchive') {
        const eligible = selectedCards.filter(c => c.status === 'archived');
        let successCount = 0;
        for (const card of eligible) {
          try {
            await request.post(`/cards/${encodeURIComponent(card.uid)}/actions`, { action: 'unarchive' });
            successCount++;
          } catch {
            // continue
          }
        }
        showToast(`Restored ${successCount} of ${eligible.length} selected cards.`, successCount > 0 ? 'success' : 'error');
      } else if (pendingBulkAction === 'delete') {
        if (!isBulkDeleteConfirmed) return;
        const eligible = selectedCards.filter(c => c.status !== 'issued' && !c.holder);
        let successCount = 0;
        for (const card of eligible) {
          try {
            await request.delete(`/cards/${card.id}`);
            successCount++;
          } catch {
            // continue
          }
        }
        showToast(`Permanently deleted ${successCount} of ${eligible.length} selected cards.`, successCount > 0 ? 'success' : 'error');
      }

      setPendingBulkAction(null);
      setDeleteConfirmation('');
      setSelectedCardIds([]);
      void load();
      void loadSummary();
    } finally {
      setBulkBusy(false);
    }
  };
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
    setIsEditingCardNumber(false);
    setEditCardNumber('');
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
  const closeDetail = () => { detailRequest.current += 1; setSelectedCard(null); setDetail(null); setIsDeleteModalOpen(false); setSingleDeleteConfirmation(''); };
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
    setAction(next);
    setUid(card?.uid ?? '');
    setCardNumber(card?.card_number ?? '');
    setRegisterStep(1);
    setStudentId('');
    setStudentSearch('');
    setNote('');
    if (next === 'register') {
      setSessionRegisteredCount(0);
      setLastRegisteredCard(null);
      setRegisterCardNumberError('');
    }
    if (next === 'issue') {
      setLoadingStudents(true);
      try {
        const result = await request.get<{ students: Student[] }>('/students/roster');
        setStudents(result.students.filter(student => !student.rfid_uid));
      } catch (e) {
        showToast(message(e), 'error');
      } finally {
        setLoadingStudents(false);
      }
    }
  };
  const handleDeleteCard = async () => {
    if (!detail?.card || isDeletingCard || !isSingleDeleteConfirmed) return;
    setIsDeletingCard(true);
    try {
      await request.delete(`/cards/${detail.card.id}`);
      showToast(`Card ${detail.card.card_number} deleted from inventory.`, 'success');
      setIsDeleteModalOpen(false);
      setSingleDeleteConfirmation('');
      closeDetail();
      void load();
      void loadSummary();
    } catch (e: any) {
      showToast(message(e), 'error');
    } finally {
      setIsDeletingCard(false);
    }
  };

  const checkCardNumberAvailable = useCallback(async (suffix: string, excludeId?: string): Promise<boolean> => {
    const cleanSuffix = suffix.trim().replace(/^RFID-?/i, '').toUpperCase();
    if (!cleanSuffix) return true;
    const candidate = `RFID-${cleanSuffix}`;
    const localMatch = cards.some(c => c.card_number.toUpperCase() === candidate && c.id !== excludeId);
    if (localMatch) return false;
    try {
      const res = await request.get<{ cards: Card[] }>(`/cards?q=${encodeURIComponent(candidate)}`);
      const remoteMatch = (res.cards || []).some(c => c.card_number.toUpperCase() === candidate && c.id !== excludeId);
      return !remoteMatch;
    } catch {
      return true;
    }
  }, [cards]);

  const handleSaveCardNumber = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!detail) return;
    const cleanSuffix = editCardNumber.trim().replace(/^RFID-?/i, '').toUpperCase();
    const clean = `RFID-${cleanSuffix}`;
    if (!cleanSuffix || clean === detail.card.card_number) {
      setEditCardNumber(detail.card.card_number.replace(/^RFID-/i, ''));
      setEditCardNumberError('');
      setIsEditingCardNumber(false);
      return;
    }
    setSavingCardNumber(true);
    try {
      const isAvailable = await checkCardNumberAvailable(cleanSuffix, detail.card.id);
      if (!isAvailable) {
        setEditCardNumberError(`Card number ${clean} is already in use.`);
        setSavingCardNumber(false);
        return;
      }
      const res = await request.patch<{ card: Card }>(`/cards/${detail.card.id}`, { card_number: clean });
      const updatedCard = res.card;
      setDetail(prev => prev ? { ...prev, card: { ...prev.card, card_number: updatedCard.card_number } } : null);
      setSelectedCard(prev => prev ? { ...prev, card_number: updatedCard.card_number } : null);
      setCards(prev => prev.map(c => c.id === detail.card.id ? { ...c, card_number: updatedCard.card_number } : c));
      setEditCardNumberError('');
      setIsEditingCardNumber(false);
      showToast(`Printed card number updated to ${clean}!`, 'success');
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err?.message || 'Failed to update card number.';
      setEditCardNumberError(errMsg);
    } finally {
      setSavingCardNumber(false);
    }
  };

  const submit = async () => {
    if (!action || !uid.trim() || (action === 'register' && !cardNumber.trim())) return;
    setBusy(true);
    try {
      await request.post(`/cards/${encodeURIComponent(uid.trim())}/actions`, {
        action,
        student_id: action === 'issue' ? studentId : undefined,
        note: note.trim() || undefined,
        card_number: action === 'register' ? cardNumber.trim() : undefined
      });

      if (action === 'register' && isContinuousRegister) {
        soundManager.playSuccessBeep();
        const savedNumber = cardNumber.trim();
        setLastRegisteredCard(savedNumber);
        setSessionRegisteredCount(prev => prev + 1);
        showToast(`Card ${savedNumber} registered successfully!`, 'success');
        setUid('');
        setCardNumber('');
        setRegisterCardNumberError('');
        setRegisterStep(1);
        void load(false);
        void loadSummary();
        requestAnimationFrame(() => {
          registerUidInputRef.current?.focus();
        });
      } else {
        setAction(null);
        closeDetail();
        showToast(action === 'register' ? 'RFID card registered.' : 'Card updated.', 'success');
        await Promise.all([load(false), loadSummary()]);
      }
    } catch (e) {
      soundManager.playErrorBuzz();
      showToast(message(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const selectedStudent = students.find(s => s.id === studentId);
  const filteredStudents = students.filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.student_id.toLowerCase().includes(q) ||
      Boolean(s.course && s.course.toLowerCase().includes(q))
    );
  });

  return <div className="mx-auto w-full max-w-[1120px] space-y-4 text-[#24133F]">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-[22px] font-extrabold">RFID Cards</h1><p className="text-xs text-[#756883]">Track physical cards, current holders, and every handoff.</p></div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" leftIcon={<Radio className="h-4 w-4" />} onClick={() => setInspectOpen(true)}>Inspect card</Button>
        <CardRegisterActionsDropdown
          onRegisterSingle={() => {
            setIsContinuousRegister(false);
            void openAction('register');
          }}
          onRapidIntake={() => {
            setIsContinuousRegister(true);
            void openAction('register');
          }}
        />
      </div>
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
    <div className="relative flex flex-col gap-2 2xl:block">
      <aside aria-label="Bulk card actions" aria-live="polite" className="flex h-9 w-full shrink-0 gap-1 2xl:absolute 2xl:right-[calc(100%+16px)] 2xl:top-12 2xl:h-auto 2xl:w-32 2xl:flex-col">
        {selectedCards.length > 0 && (
          <>
            {canBulkArchive && (
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setPendingBulkAction('archive')}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#7026B7] transition-colors hover:bg-purple-100 focus-visible:outline-2 focus-visible:outline-[#7026B7] disabled:opacity-40 cursor-pointer"
              >
                <Archive className="h-3.5 w-3.5 shrink-0" /> Archive
              </button>
            )}
            {canBulkRestore && (
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setPendingBulkAction('unarchive')}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-40 cursor-pointer"
              >
                <ArchiveRestore className="h-3.5 w-3.5 shrink-0" /> Restore
              </button>
            )}
            <button
              type="button"
              disabled={bulkBusy || !canBulkDelete}
              title={
                !canBulkDelete
                  ? 'Only cards with no holder or scan history can be deleted. Deselect issued cards or archive instead.'
                  : 'Delete selected cards permanently'
              }
              onClick={() => setPendingBulkAction('delete')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-rose-500 disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" /> Delete
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setSelectedCardIds([])}
              className="inline-flex h-9 items-center rounded-lg px-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
            >
              Clear
            </button>
          </>
        )}
      </aside>
    <div className="w-full min-w-0 overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-3">
      {loading ? (
        <LoadingState
          title="Loading cards…"
          description="Finding registered cards and their current holders."
        />
      ) : cards.length === 0 ? (
        <EmptyState
          variant={
            status === 'damaged' || status === 'lost'
              ? 'damaged-cards'
              : search || status !== 'all'
              ? 'no-search-results'
              : 'empty-cards'
          }
          title={
            status === 'damaged'
              ? 'No damaged cards found'
              : status === 'lost'
              ? 'No lost cards recorded'
              : search || status !== 'all'
              ? 'No cards match this filter'
              : 'No RFID cards registered yet'
          }
          description={
            search || status !== 'all'
              ? 'Try clearing your search terms or switching to another status filter.'
              : 'Add physical cards to your inventory so they can be assigned to students.'
          }
          action={
            search || status !== 'all'
              ? {
                  label: 'Reset Filters',
                  variant: 'secondary',
                  onClick: () => {
                    setSearch('');
                    setStatus('all');
                    setPage(1);
                  },
                }
              : {
                  label: 'Register First Card',
                  variant: 'primary',
                  onClick: () => setAction('register'),
                }
          }
        />
      ) : <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E0EB] text-[#756883]">
                <th className="px-4 py-3 font-semibold">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      aria-label={`Select all cards on this page (${cards.length})`}
                      checked={allVisibleSelected}
                      disabled={!cards.length || bulkBusy}
                      onChange={(e) => setSelectedCardIds(e.target.checked ? cards.map(c => c.id) : [])}
                    />
                    <span>Card No.</span>
                    {selectedCards.length > 0 && (
                      <span className="font-bold text-[#7026B7]">
                        {selectedCards.length} selected
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Current holder</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map(card => {
                const isSelected = selectedCardIds.includes(card.id);
                return (
                  <tr
                    key={card.id}
                    onClick={() => void openDetail(card)}
                    className={`border-b border-[#F1EEF4] last:border-0 cursor-pointer transition-colors group ${
                      isSelected ? 'bg-purple-50/70 hover:bg-purple-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            aria-label={`Select card ${card.card_number}`}
                            checked={isSelected}
                            disabled={bulkBusy}
                            onChange={(e) =>
                              setSelectedCardIds((prev) =>
                                e.target.checked ? [...prev, card.id] : prev.filter((id) => id !== card.id)
                              )
                            }
                          />
                        </span>
                        <div>
                          <p className="font-bold text-[#24133F] group-hover:text-[#7026B7] transition-colors">{card.card_number}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-[#756883]">UID {card.uid}</p>
                        </div>
                      </div>
                    </td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 font-bold capitalize ${statusStyle[card.status]}`}>{card.status}</span></td><td className="px-4 py-4">{card.holder ? <div className="flex items-center gap-2.5">{card.holder.avatar_url ? <img src={card.holder.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover group-hover:scale-105 transition-transform" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2E9FC] text-[10px] font-bold text-[#7026B7] group-hover:scale-105 transition-transform">{card.holder.student_name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>}<span><span className="block font-semibold group-hover:text-[#7026B7] transition-colors">{card.holder.student_name}</span><span className="text-[#756883]">{card.holder.student_number}</span></span></div> : <span className="text-[#A59AAB]">No current holder</span>}</td><td className="px-4 py-4 text-[#756883]">{date(card.created_at)}</td><td className="px-4 py-4 text-right"><button type="button" onClick={(e) => { e.stopPropagation(); void openDetail(card); }} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 cursor-pointer">View History →</button></td></tr>); })}</tbody></table>}
    </div>
    </div>
    {total > 25 && <div className="flex items-center justify-end gap-2 text-xs"><Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {Math.ceil(total / 25)}</span><Button variant="secondary" size="sm" disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>Next</Button></div>}
    <Drawer isOpen={Boolean(selectedCard)} onClose={closeDetail} title={selectedCard?.card_number ?? 'Card history'} maxWidth="2xl" hideHeader noPadding>
      {detail && <div className="min-h-full bg-white text-xs text-[#24133F]"><div className="bg-gradient-to-b from-[#9333EA] via-[#C084FC] via-[#F3E8FF] to-white px-7 pb-10 pt-6"><div className="flex items-start justify-between">
          {!isEditingCardNumber ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setEditCardNumber(detail.card.card_number.replace(/^RFID-/i, ''));
                setEditCardNumberError('');
                setIsEditingCardNumber(true);
              }}
              className="group flex items-center gap-2 rounded-xl py-0.5 px-2 -ml-2 transition-all hover:bg-white/20 cursor-pointer"
              title="Click to edit printed card number"
            >
              <h2 className="text-2xl font-black text-white tracking-tight truncate max-w-[340px] drop-shadow-sm font-mono">
                {detail.card.card_number}
              </h2>
              <Pencil className="h-4 w-4 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          ) : (
            <div className="flex flex-col gap-1 flex-1 max-w-[360px]">
              <div className="flex items-center gap-1 text-2xl font-black text-white tracking-tight font-mono">
                <span className="select-none opacity-90">RFID-</span>
                <input
                  type="text"
                  value={editCardNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/^RFID-?/i, '').replace(/[^A-Z0-9-]/gi, '').toUpperCase();
                    setEditCardNumber(clean);
                    if (clean && `RFID-${clean}` !== detail.card.card_number) {
                      void checkCardNumberAvailable(clean, detail.card.id).then(avail => {
                        setEditCardNumberError(avail ? '' : `RFID-${clean} already exists`);
                      });
                    } else {
                      setEditCardNumberError('');
                    }
                  }}
                  onBlur={() => {
                    if (!editCardNumberError) {
                      void handleSaveCardNumber();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveCardNumber();
                    if (e.key === 'Escape') {
                      setEditCardNumber(detail.card.card_number.replace(/^RFID-/i, ''));
                      setEditCardNumberError('');
                      setIsEditingCardNumber(false);
                    }
                  }}
                  disabled={savingCardNumber}
                  autoFocus
                  placeholder="001"
                  maxLength={27}
                  className={`text-2xl font-black uppercase text-white tracking-tight bg-transparent border-b-2 outline-none px-0 py-0 w-32 placeholder:text-white/60 font-mono ${editCardNumberError ? 'border-rose-300 text-rose-100' : 'border-white'}`}
                />
                {savingCardNumber && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white shrink-0 ml-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    Saving…
                  </span>
                )}
              </div>
              {editCardNumberError && (
                <p className="text-[11px] font-bold text-rose-200 bg-rose-950/70 backdrop-blur-md px-2 py-0.5 rounded-md inline-flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                  <CircleAlert className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                  {editCardNumberError}
                </p>
              )}
            </div>
          )}<div className="flex gap-2">
                <button type="button" disabled={!['available', 'archived'].includes(detail.card.status)} onClick={() => void openAction(detail.card.status === 'archived' ? 'unarchive' : 'archive', detail.card)} aria-label={detail.card.status === 'archived' ? 'Restore archived card' : 'Archive card'} title={detail.card.status === 'issued' ? 'Return the card before archiving' : detail.card.status === 'archived' ? 'Restore archived card' : detail.card.status === 'available' ? 'Archive card' : 'Restore the card before archiving'} className="rounded-2xl border border-white/30 bg-white/20 p-2.5 text-white hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                  {detail.card.status === 'archived' ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
                </button>
                {(() => {
                  const hasHistory = Boolean(
                    (detail.assignments && detail.assignments.length > 0) ||
                    (detail.recent_scans && detail.recent_scans.length > 0) ||
                    detail.card.status === 'issued'
                  );
                  return (
                    <button
                      type="button"
                      disabled={hasHistory || isDeletingCard}
                      onClick={() => { setSingleDeleteConfirmation(''); setIsDeleteModalOpen(true); }}
                      aria-label="Delete card"
                      title={
                        hasHistory
                          ? 'Cards with holder or scan history cannot be deleted to preserve attendance audit trail. Archive the card instead.'
                          : 'Delete card permanently from inventory'
                      }
                      className="rounded-2xl border border-white/30 bg-white/20 p-2.5 text-white transition-all hover:bg-rose-600/80 hover:border-rose-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  );
                })()}
                <button type="button" onClick={closeDetail} aria-label="Close card history" className="rounded-2xl border border-white/30 bg-white/20 p-2.5 text-white hover:bg-white/30 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div></div><div className="mt-2 flex justify-center"><div className="relative h-72 w-72 sm:h-80 sm:w-80"><img src={hawiCard} alt="" className="h-full w-full object-contain" /><span className="absolute left-[32%] top-[72%] -rotate-1 whitespace-nowrap font-sans text-sm font-black tracking-wide text-[#24133F] sm:text-base">{detail.card.card_number.replace(/^RFID-/, '')}</span></div></div></div><div className="space-y-6 px-7 pb-10">
        <div className="border-b border-[#F1EEF4] pb-5"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#A59AAB]">Card UID</p><div className="flex items-center justify-between gap-3"><p className="font-mono text-sm font-bold">{detail.card.uid}</p><span className={`rounded-full px-3 py-1 font-bold capitalize ${statusStyle[detail.card.status]}`}>{detail.card.status}</span></div><div className="mt-4 flex flex-wrap gap-2 [&>button]:flex-1 [&>button]:justify-center [&>button]:whitespace-nowrap">{detail.card.status === 'available' && <Button size="sm" leftIcon={<CreditCard className="h-4 w-4" />} onClick={() => void openAction('issue', detail.card)}>Issue card</Button>}{detail.card.status === 'issued' && <Button size="sm" variant="success" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => void openAction('return', detail.card)}>Return card</Button>}{['available', 'issued'].includes(detail.card.status) && <><Button size="sm" variant="danger" leftIcon={<ShieldAlert className="h-4 w-4" />} onClick={() => void openAction('lost', detail.card)}>Report lost</Button><Button size="sm" variant="secondary" leftIcon={<CircleAlert className="h-4 w-4" />} onClick={() => void openAction('damaged', detail.card)}>Mark damaged</Button></>}{['lost', 'damaged'].includes(detail.card.status) && <Button size="sm" variant="secondary" leftIcon={<ArchiveRestore className="h-4 w-4" />} onClick={() => void openAction('restore', detail.card)}>Restore to available</Button>}</div></div>
        {(detail.assignments.length > 0 || detailReady) && <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#A59AAB]">{detailReady ? `Holder history · ${detail.assignments.length}` : 'Current holder'}</h3><div className="space-y-3">{detail.assignments.length ? detail.assignments.map(a => { const scans = detail.recent_scans.filter(scan => scan.student_id === a.student_id && scan.recorded_at >= a.issued_at && (!a.ended_at || scan.recorded_at <= a.ended_at)); return <div key={a.id} className="overflow-hidden rounded-2xl border border-[#E5E0EB]"><div className="flex flex-wrap items-center gap-3 p-4">{a.avatar_url ? <img src={a.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F2E9FC]"><UserRound className="h-5 w-5 text-[#7026B7]" /></span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-base">{a.student_name}</b><span className="rounded-full bg-[#F7F1FD] px-2 py-0.5 font-bold text-[#7026B7]">@{a.student_number}</span>{!a.ended_at && <span className="rounded-full bg-[#E7F8EE] px-2 py-0.5 font-bold text-[#087A3A]">Current</span>}</div>{a.course && <p className="mt-0.5 text-[#756883]">{a.course}{a.year_level ? ` · ${formatYearLevel(a.year_level)}` : ''}</p>}<p className="mt-1 text-[#756883]">Issued {date(a.issued_at)}{a.ended_at ? ` · ${a.end_reason} ${date(a.ended_at)}` : ''}</p></div>{a.student_id && <Button size="sm" leftIcon={<ExternalLink className="h-3.5 w-3.5" />} onClick={() => void handleViewStudentProfile(a)}>View Profile</Button>}</div>{detailReady && (
                <div className="border-t border-[#F1EEF4] bg-[#FAF8FC] px-4 py-3">
                  <p className="mb-2 font-bold text-[#756883]">Scans with this card</p>
                  {scans.length ? (
                    <div className="space-y-2">
                      {scans.map((scan) => (
                        <div key={scan.id} className="flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-[#24133F]">
                                {scan.type === 'time_in' ? 'Time in' : 'Time out'}
                              </span>
                              {scan.event_name && (
                                <>
                                  <span className="text-[#A59AAB]">·</span>
                                  <span className="text-[#756883] truncate">{scan.event_name}</span>
                                </>
                              )}
                              {scan.session_name && (
                                <>
                                  <span className="text-[#A59AAB]">·</span>
                                  <span className="text-[#756883] truncate">{scan.session_name}</span>
                                </>
                              )}
                            </div>
                            {scan.location_name && (
                              <p className="mt-0.5 text-[11px] text-[#A59AAB]">{scan.location_name}</p>
                            )}
                          </div>
                          <time className="text-[#756883] shrink-0 text-right">{date(scan.recorded_at)}</time>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#756883]">No scans recorded while this student held the card.</p>
                  )}
                </div>
              )}</div>; }) : <p className="rounded-2xl border border-[#E5E0EB] p-4 text-[#756883]">No holder yet.</p>}</div></section>}
        {detailError && selectedCard && <Button size="sm" onClick={() => void openDetail(selectedCard)}>Retry history</Button>}
        {detailReady && (
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#A59AAB]">Card activity</h3>
            <div className="divide-y divide-[#F1EEF4] rounded-2xl border border-[#E5E0EB] bg-white overflow-hidden">
              {detail.events.length ? (
                detail.events.map((event) => (
                  <div key={event.id} className="p-3.5 sm:p-4 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-sm capitalize text-[#24133F]">{event.action.replace(/_/g, ' ')}</b>
                      {event.student_name && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                          <UserRound className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{event.student_name}</span>
                          {event.student_number && (
                            <span className="rounded-full bg-[#F7F1FD] px-2 py-0.5 text-[11px] font-bold text-[#7026B7]">
                              @{event.student_number}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#756883]">
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <time>{date(event.created_at)}</time>
                      </span>

                      {event.actor?.name && (
                        <span className="inline-flex items-center gap-1 shrink-0">
                          <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{event.actor.name}</span>
                        </span>
                      )}

                      {event.note && (
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="italic truncate">"{event.note}"</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-4 text-xs text-[#756883]">No activity recorded for this card.</p>
              )}
            </div>
          </section>
        )}
      </div></div>}
    </Drawer>
    <Modal
      isOpen={isDeleteModalOpen && Boolean(detail?.card)}
      onClose={() => {
        if (!isDeletingCard) {
          setIsDeleteModalOpen(false);
          setSingleDeleteConfirmation('');
        }
      }}
      title="Delete Card"
      maxWidth="md"
      zIndex={600}
    >
      {detail?.card && (
        <div className="space-y-4 p-6 text-xs text-[#24133F]">
          <div className="flex justify-center">
            <img src={hawiTrash} alt="" className="h-28 w-28 object-contain" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-[#24133F]">
              Permanently delete {detail.card.card_number}?
            </p>
            <p className="text-xs text-[#756883] leading-relaxed">
              This card has no recorded holder or scan history and will be completely removed from inventory. This action cannot be undone.
            </p>
          </div>
          <div className="space-y-1.5 text-xs font-semibold text-slate-700">
            <div className="flex items-center justify-between">
              <span>Type <strong className="font-bold">"DELETE"</strong> to confirm</span>
              {isSingleDeleteConfirmed && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 animate-in fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Matched
                </span>
              )}
            </div>
            <div className="relative">
              <input
                value={singleDeleteConfirmation}
                onChange={(e) => setSingleDeleteConfirmation(e.target.value.toUpperCase())}
                disabled={isDeletingCard}
                autoComplete="off"
                placeholder="DELETE"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-sans font-bold tracking-wider outline-none transition-all ${
                  isSingleDeleteConfirmed
                    ? 'border-emerald-500 bg-emerald-50/20 text-slate-900 pr-10 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                    : 'border-slate-300 text-slate-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                } placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal`}
              />
              {isSingleDeleteConfirmed && (
                <CheckCircle2 className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 animate-in fade-in" />
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2.5 border-t border-[#F1EEF4] pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={isDeletingCard}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSingleDeleteConfirmation('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={isDeletingCard}
              disabled={!isSingleDeleteConfirmed}
              onClick={() => void handleDeleteCard()}
            >
              Delete Card
            </Button>
          </div>
        </div>
      )}
    </Modal>
    <Modal
      isOpen={Boolean(pendingBulkAction)}
      onClose={() => !bulkBusy && setPendingBulkAction(null)}
      title={
        pendingBulkAction === 'archive'
          ? 'Archive Selected Cards'
          : pendingBulkAction === 'unarchive'
          ? 'Restore Selected Cards'
          : 'Delete Selected Cards'
      }
      maxWidth="md"
      zIndex={600}
    >
      <div className="space-y-4 p-6 text-xs text-[#24133F]">
        <div className="flex justify-center">
          <img
            src={
              pendingBulkAction === 'archive'
                ? hawiBox
                : pendingBulkAction === 'unarchive'
                ? hawiCheck
                : hawiTrash
            }
            alt=""
            className="h-28 w-28 object-contain"
          />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-[#24133F]">
            {pendingBulkAction === 'archive'
              ? `Archive ${selectedCards.filter(c => c.status === 'available').length} card(s)?`
              : pendingBulkAction === 'unarchive'
              ? `Restore ${selectedCards.filter(c => c.status === 'archived').length} card(s)?`
              : `Permanently delete ${selectedCards.length} card(s)?`}
          </p>
          <p className="text-xs text-[#756883] leading-relaxed">
            {pendingBulkAction === 'archive'
              ? 'Archived cards cannot be issued to students. Their historical audit logs remain preserved.'
              : pendingBulkAction === 'unarchive'
              ? 'These cards will be restored to available inventory and can be issued to students again.'
              : 'These cards have no recorded holder or scan history and will be completely removed from inventory. This action cannot be undone.'}
          </p>
        </div>
        {pendingBulkAction === 'delete' && (
          <div className="space-y-1.5 text-xs font-semibold text-slate-700">
            <div className="flex items-center justify-between">
              <span>Type <strong className="font-bold">"DELETE"</strong> to confirm</span>
              {isBulkDeleteConfirmed && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 animate-in fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Matched
                </span>
              )}
            </div>
            <div className="relative">
              <input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase())}
                disabled={bulkBusy}
                autoComplete="off"
                placeholder="DELETE"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-sans font-bold tracking-wider outline-none transition-all ${
                  isBulkDeleteConfirmed
                    ? 'border-emerald-500 bg-emerald-50/20 text-slate-900 pr-10 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                    : 'border-slate-300 text-slate-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                } placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal`}
              />
              {isBulkDeleteConfirmed && (
                <CheckCircle2 className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 animate-in fade-in" />
              )}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2.5 border-t border-[#F1EEF4] pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={bulkBusy}
            onClick={() => {
              setPendingBulkAction(null);
              setDeleteConfirmation('');
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={pendingBulkAction === 'delete' ? 'danger' : 'primary'}
            isLoading={bulkBusy}
            disabled={pendingBulkAction === 'delete' && !isBulkDeleteConfirmed}
            onClick={() => void runBulkAction()}
          >
            {pendingBulkAction === 'archive'
              ? 'Archive Cards'
              : pendingBulkAction === 'unarchive'
              ? 'Restore Cards'
              : 'Delete Cards'}
          </Button>
        </div>
      </div>
    </Modal>
    <Modal isOpen={inspectOpen} onClose={() => !inspecting && setInspectOpen(false)} title="Inspect RFID card" description="Tap a card to find its status, holder, and history." maxWidth="md">
      <div className="space-y-4 p-6 text-xs"><div className="flex justify-center"><img src={hawiScanning} alt="" className="h-28 w-28 object-contain" /></div><label className="block font-semibold">Scan card UID<div className="relative mt-2"><Radio className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#756883]" /><input autoFocus value={inspectUid} onChange={event => setInspectUid(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void inspectCard(); } }} placeholder="Tap or scan card now" className="h-10 w-full rounded-xl border border-[#E5E0EB] pl-9 pr-3 focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100" /></div></label><div className="flex justify-end gap-2 border-t border-[#F1EEF4] pt-4"><Button variant="secondary" onClick={() => setInspectOpen(false)} disabled={inspecting}>Cancel</Button><Button onClick={() => void inspectCard()} disabled={!inspectUid.trim()} isLoading={inspecting}>Inspect card</Button></div></div>
    </Modal>
    <Modal
      isOpen={Boolean(action)}
      onClose={() => !busy && setAction(null)}
      title={
        activeAction === 'register' ? (isContinuousRegister ? 'Rapid Card Intake' : 'Register RFID card') :
        activeAction === 'issue' ? 'Issue RFID card' :
        activeAction === 'return' ? 'Return RFID card' :
        activeAction === 'lost' ? 'Report lost card' :
        activeAction === 'damaged' ? 'Mark damaged card' :
        activeAction === 'archive' ? 'Archive RFID card' :
        activeAction === 'unarchive' ? 'Restore archived card' :
        'Restore RFID card'
      }
      description={
        activeAction === 'register' ? (isContinuousRegister ? 'Continuous batch intake mode. Tap card, type number, press Enter.' : 'Quick 1-card registration into inventory.') :
        activeAction === 'issue' ? 'Assign this physical card to an active student.' :
        activeAction === 'archive' ? 'Remove this card from circulation. Its history stays available.' :
        activeAction === 'unarchive' ? 'Make this card available to issue again.' :
        activeAction === 'return' ? 'Unlink this card from its student and return it to inventory.' :
        activeAction === 'lost' ? 'Deactivate this card and record it as lost in the audit trail.' :
        activeAction === 'damaged' ? 'Flag this card as damaged and take it out of circulation.' :
        'Card history stays available for auditing.'
      }
      maxWidth={activeAction === 'issue' ? 'lg' : 'md'}
    >
      <div className="space-y-4 p-6 text-xs">
        {activeAction === 'register' && (
          <div className="relative mb-5 flex items-start justify-between px-8" aria-label={`Step ${registerStep} of 2`}>
            <div className="absolute left-[25%] right-[25%] top-4 h-[2px] bg-[#E5E0EB]" />
            <div className={`absolute left-[25%] top-4 h-[2px] bg-[#A855F7] transition-all ${registerStep === 2 ? 'w-1/2' : 'w-0'}`} />
            {(['Scan card', 'Card number'] as const).map((title, index) => (
              <div key={title} className="relative z-10 flex w-24 flex-col items-center gap-2 text-center">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${registerStep === index + 1 ? 'bg-[#A855F7] text-white ring-4 ring-[#A855F7]/25' : registerStep > index + 1 ? 'bg-[#A855F7] text-white' : 'bg-[#F3E8FF] text-[#A855F7]'}`}>
                  {registerStep > index + 1 ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className={registerStep === index + 1 ? 'font-bold text-[#24133F]' : 'text-[#756883]'}>{title}</span>
              </div>
            ))}
          </div>
        )}

        {activeAction !== 'issue' && (
          <div className="flex justify-center">
            <img
              src={
                activeAction === 'damaged' ? hawiBrokenCard :
                activeAction === 'lost' ? hawiCrying :
                activeAction === 'archive' ? hawiBox :
                activeAction === 'restore' || activeAction === 'unarchive' ? hawiCheck :
                activeAction === 'return' || activeAction === 'register' ? hawiScanning :
                hawiLooking
              }
              alt=""
              className="h-24 w-24 object-contain"
            />
          </div>
        )}

        {/* Confirmation Question Headline for Status Changing Actions */}
        {['lost', 'damaged', 'return', 'archive', 'unarchive', 'restore'].includes(activeAction) && (
          <div className="text-center space-y-1">
            <h3 className="text-base font-extrabold text-[#24133F]">
              {activeAction === 'lost'
                ? `Mark ${cardNumber || 'this card'} as lost?`
                : activeAction === 'damaged'
                ? `Mark ${cardNumber || 'this card'} as damaged?`
                : activeAction === 'return'
                ? `Return ${cardNumber || 'this card'} to inventory?`
                : activeAction === 'archive'
                ? `Archive ${cardNumber || 'this card'}?`
                : `Restore ${cardNumber || 'this card'} to inventory?`}
            </h3>
            <p className="text-xs text-[#756883] leading-relaxed">
              {activeAction === 'lost'
                ? 'This card will be deactivated immediately and taken out of circulation. Attendance checkpoints will reject this card.'
                : activeAction === 'damaged'
                ? 'This physical card will be marked as damaged and taken out of active circulation.'
                : activeAction === 'return'
                ? 'This card will be unlinked from the student and made available for reassignment.'
                : activeAction === 'archive'
                ? 'This card will be moved to the archive. Historical audit trails remain preserved.'
                : 'This card will be returned to available inventory and can be issued to students again.'}
            </p>
          </div>
        )}

        {/* Clean Card Summary Pill for Confirmation Modals */}
        {['lost', 'damaged', 'return', 'archive', 'unarchive', 'restore'].includes(activeAction) && (
          <div className="flex items-center justify-between rounded-xl border border-[#E5E0EB] bg-[#FAF8FC] px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#7026B7]" />
              <span className="font-mono text-xs font-bold text-[#24133F]">{cardNumber || 'Card'}</span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-[#756883]">UID: {uid}</span>
          </div>
        )}

        {lastRegisteredCard && activeAction === 'register' && registerStep === 1 && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Card {lastRegisteredCard} registered! Tap next card on reader.</span>
            </div>
            {sessionRegisteredCount > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E7F8EE] px-2.5 py-0.5 text-[11px] font-bold text-[#087A3A]">
                {sessionRegisteredCount} registered
              </span>
            )}
          </div>
        )}

        {activeAction === 'register' && registerStep === 1 && (
          <label className="block font-semibold text-[#24133F]">
            <span>1. Tap physical card on USB reader</span>
            <div className="relative mt-1.5">
              <Radio className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7026B7]" />
              <input
                ref={registerUidInputRef}
                value={uid}
                onChange={e => setUid(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (uid.trim()) {
                      setRegisterStep(2);
                      requestAnimationFrame(() => cardNumberRef.current?.focus());
                    }
                  }
                }}
                autoFocus
                placeholder="Waiting for card tap..."
                className="block h-10 w-full rounded-xl border border-[#E5E0EB] py-0 pl-9 pr-3 font-mono font-bold text-[#24133F] focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100 disabled:bg-[#F7F6F9]"
              />
            </div>
            <span className="mt-1 block text-[11px] font-normal text-[#756883]">
              The reader automatically captures the UID and advances to the printed number.
            </span>
          </label>
        )}

        {activeAction === 'register' && registerStep === 2 && (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] px-4 py-3">
              <span className="font-semibold text-[#756883]">Card scanned</span>
              <span className="font-mono font-bold text-[#24133F]">{uid.trim()}</span>
            </div>
            <label className="block font-semibold text-[#24133F]">
              <span>2. Printed Card No. (look at card)</span>
              <div className="relative mt-1.5 flex items-center rounded-xl border border-[#E5E0EB] bg-white overflow-hidden transition-all focus-within:border-[#7026B7] focus-within:ring-4 focus-within:ring-purple-100">
                <span className="flex items-center bg-[#F4EFFB] px-3.5 py-2.5 font-mono text-xs font-black text-[#7026B7] border-r border-[#E5E0EB] select-none">
                  RFID-
                </span>
                <input
                  ref={cardNumberRef}
                  value={cardNumber.replace(/^RFID-?/i, '')}
                  onChange={e => {
                    const clean = e.target.value.replace(/^RFID-?/i, '').replace(/[^A-Z0-9-]/gi, '').toUpperCase();
                    setCardNumber(clean ? `RFID-${clean}` : '');
                    if (clean) {
                      void checkCardNumberAvailable(clean).then(avail => {
                        setRegisterCardNumberError(avail ? '' : `RFID-${clean} already exists`);
                      });
                    } else {
                      setRegisterCardNumberError('');
                    }
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!busy && !registerCardNumberError) void submit(); } }}
                  placeholder="001"
                  maxLength={27}
                  className="block h-10 w-full px-3 text-xs font-mono font-bold uppercase text-[#24133F] outline-none"
                />
              </div>
              {registerCardNumberError ? (
                <span className="mt-1.5 flex items-center gap-1 text-xs font-bold text-rose-600">
                  <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                  {registerCardNumberError}
                </span>
              ) : (
                <span className="mt-1.5 block font-normal text-[#756883]">Enter the number printed on this card.</span>
              )}
            </label>
          </>
        )}

        {action === 'issue' && (
          <div className="space-y-4">
            {/* Card Summary Banner */}
            <div className="flex items-center justify-between rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7026B7] text-white shadow-xs">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-mono text-sm font-black text-[#24133F] tracking-tight">
                    {cardNumber || 'RFID Card'}
                  </h4>
                  <p className="font-mono text-[11px] font-semibold text-[#756883] mt-0.5">
                    UID: <span className="font-bold text-[#7026B7]">{uid}</span>
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#E7F8EE] px-3 py-1 font-bold text-[#087A3A] text-xs">
                Available
              </span>
            </div>

            {/* Target Student Picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#24133F]">Assign to Student *</label>
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      setStudentId('');
                      setStudentSearch('');
                    }}
                    className="text-[11px] font-bold text-[#7026B7] hover:underline cursor-pointer"
                  >
                    Change student
                  </button>
                )}
              </div>

              {selectedStudent ? (
                <div className="rounded-2xl border-2 border-[#7026B7] bg-purple-50/40 p-3.5 flex items-center justify-between transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedStudent.avatar_url ? (
                      <img
                        src={selectedStudent.avatar_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover shrink-0 ring-2 ring-purple-200"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7026B7] text-white text-xs font-bold">
                        {selectedStudent.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-[#24133F] truncate">
                          {selectedStudent.name}
                        </h4>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E7F8EE] px-2 py-0.5 text-[10px] font-bold text-[#087A3A] shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Selected
                        </span>
                      </div>
                      <p className="text-[11px] text-[#756883] font-medium mt-0.5 truncate">
                        <span className="font-mono font-bold text-[#24133F]">{selectedStudent.student_id}</span>
                        {selectedStudent.course && ` · ${selectedStudent.course}`}
                        {selectedStudent.year_level ? ` · ${formatYearLevel(selectedStudent.year_level)}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStudentId('');
                      setStudentSearch('');
                    }}
                    className="text-xs font-bold text-[#7026B7] hover:text-purple-900 bg-white border border-purple-200 hover:border-purple-300 px-3 py-1.5 rounded-xl shadow-2xs transition-colors shrink-0 ml-2 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative flex items-center rounded-xl border border-[#E5E0EB] bg-white px-3 focus-within:border-[#7026B7] focus-within:ring-4 focus-within:ring-purple-100 transition-all">
                    <Search className="h-4 w-4 text-[#756883] shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="Search by student name, ID, or course..."
                      className="h-10 w-full bg-transparent px-2 text-xs font-medium text-[#24133F] outline-none placeholder:text-[#A59AAB]"
                    />
                    {studentSearch && (
                      <button
                        type="button"
                        onClick={() => setStudentSearch('')}
                        className="text-xs text-[#A59AAB] hover:text-[#24133F] p-1 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-52 overflow-y-auto rounded-xl border border-[#E5E0EB] bg-white divide-y divide-[#F1EEF4] shadow-2xs">
                    {loadingStudents ? (
                      <div className="flex items-center justify-center gap-2 p-5 text-xs text-[#756883]">
                        <Loader2 className="h-4 w-4 animate-spin text-[#7026B7]" />
                        <span>Loading eligible students...</span>
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#756883]">
                        <p className="font-semibold text-[#24133F]">No students found</p>
                        <p className="mt-1 text-[11px] text-[#A59AAB]">
                          {studentSearch ? `No unassigned students match "${studentSearch}"` : 'All registered students already have an active RFID card.'}
                        </p>
                      </div>
                    ) : (
                      filteredStudents.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setStudentId(s.id);
                          }}
                          className="w-full flex items-center justify-between p-2.5 text-left transition-colors hover:bg-purple-50/60 focus-visible:bg-purple-50 focus-visible:outline-none group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {s.avatar_url ? (
                              <img src={s.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F2E9FC] text-[10px] font-bold text-[#7026B7] group-hover:scale-105 transition-transform">
                                {s.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#24133F] truncate group-hover:text-[#7026B7] transition-colors">
                                {s.name}
                              </p>
                              <p className="text-[11px] text-[#756883] font-medium truncate mt-0.5">
                                <span className="font-mono text-[#24133F] font-bold">{s.student_id}</span>
                                {s.course && ` · ${s.course}`}
                                {s.year_level ? ` · ${formatYearLevel(s.year_level)}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-[#7026B7] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                            Assign →
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Optional Note */}
            <label className="block text-xs font-semibold text-[#24133F]">
              <span>Handoff Note (optional)</span>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={500}
                placeholder="Reason or handoff detail (e.g. Initial issuance)"
                className="mt-1.5 block h-10 w-full rounded-xl border border-[#E5E0EB] px-3 text-xs focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100 placeholder:text-[#A59AAB]"
              />
            </label>
          </div>
        )}

        {activeAction !== 'issue' && activeAction !== 'register' && (
          <label className="block text-xs font-semibold text-[#24133F]">
            <span>Reason or note (optional)</span>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={500}
              placeholder={
                activeAction === 'lost'
                  ? 'e.g. Student reported lost at cafeteria'
                  : activeAction === 'damaged'
                  ? 'e.g. Cracked casing or antenna fault'
                  : activeAction === 'return'
                  ? 'e.g. Card surrendered at registrar desk'
                  : 'e.g. Audit note or detail'
              }
              className="mt-1.5 block h-10 w-full rounded-xl border border-[#E5E0EB] px-3 text-xs focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100 placeholder:text-[#A59AAB]"
            />
          </label>
        )}

        <div className={`flex gap-2 border-t border-[#F1EEF4] pt-4 ${activeAction === 'register' ? 'justify-between' : 'justify-end'}`}>
          <Button
            variant="secondary"
            onClick={() => {
              if (activeAction === 'register' && registerStep === 2) {
                setRegisterStep(1);
                requestAnimationFrame(() => registerUidInputRef.current?.focus());
              } else {
                setAction(null);
              }
            }}
            disabled={busy}
            leftIcon={activeAction === 'register' ? undefined : <X className="h-4 w-4" />}
          >
            {activeAction === 'register' && registerStep === 2
              ? 'Back'
              : activeAction === 'register' && sessionRegisteredCount > 0
              ? 'Done (Close)'
              : 'Cancel'}
          </Button>
          <Button
            variant={activeAction === 'lost' || activeAction === 'damaged' ? 'danger' : activeAction === 'return' ? 'success' : 'primary'}
            onClick={() => {
              if (activeAction === 'register' && registerStep === 1) {
                setRegisterStep(2);
                requestAnimationFrame(() => cardNumberRef.current?.focus());
              } else void submit();
            }}
            isLoading={busy}
            disabled={!uid.trim() || (activeAction === 'register' && registerStep === 2 && (!cardNumber.trim() || Boolean(registerCardNumberError))) || (activeAction === 'issue' && !studentId)}
          >
            {activeAction === 'register'
              ? registerStep === 1 ? 'Next →' : (isContinuousRegister ? 'Register & Next (Enter)' : 'Register card')
              : activeAction === 'issue'
              ? selectedStudent ? `Issue to ${selectedStudent.name.split(' ')[0]}` : 'Issue card'
              : activeAction === 'return'
              ? 'Confirm return'
              : activeAction === 'lost'
              ? 'Report lost'
              : activeAction === 'damaged'
              ? 'Mark damaged'
              : activeAction === 'archive'
              ? 'Archive card'
              : 'Restore card'}
          </Button>
        </div>
      </div>
    </Modal>
    <StudentProfileDrawer
      isOpen={isProfileDrawerOpen}
      onClose={() => setIsProfileDrawerOpen(false)}
      student={selectedStudentForProfile}
      onUnlinkCard={async (_studentId, reason) => {
        try {
          if (selectedStudentForProfile?.rfid_uid) {
            await request.post(`/cards/${encodeURIComponent(selectedStudentForProfile.rfid_uid)}/actions`, {
              action: reason === 'lost' ? 'lost' : 'return',
              note: reason === 'lost' ? 'Unlinked and reported lost from profile' : 'Unlinked from profile',
            });
            showToast('Card unlinked from student.', 'success');
            setIsProfileDrawerOpen(false);
            if (selectedCard) void openDetail(selectedCard);
            void load(false);
            void loadSummary();
          }
        } catch (e) {
          showToast(message(e), 'error');
        }
      }}
      onQuickPair={async (studentId, cardUid) => {
        try {
          await request.post(`/cards/${encodeURIComponent(cardUid)}/actions`, {
            action: 'issue',
            student_id: studentId,
          });
          showToast('Card paired with student.', 'success');
          if (selectedCard) void openDetail(selectedCard);
          void load(false);
          void loadSummary();
          return { success: true, message: 'Card linked successfully.' };
        } catch (e) {
          const err = message(e);
          showToast(err, 'error');
          return { success: false, message: err };
        }
      }}
      onOpenRapidScan={() => {
        setIsProfileDrawerOpen(false);
      }}
      onUpdateStudent={async (studentId, payload) => {
        await studentService.updateStudent(studentId, payload);
        showToast('Student profile updated.', 'success');
        if (selectedStudentForProfile) {
          setSelectedStudentForProfile(prev => prev ? { ...prev, ...payload } : null);
        }
        if (selectedCard) void openDetail(selectedCard);
      }}
      onResetPassword={async (studentId, password) => {
        await request.post(`/students/${studentId}/password`, { password });
        showToast('Password reset successfully.', 'success');
      }}
    />
  </div>;
}
