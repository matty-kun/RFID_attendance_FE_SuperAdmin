import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Button } from '../../../components/common/Button';
import { toast } from '../../../context';
import { studentService } from '../services/studentService';
import type { StudentRecord } from '../models';
import {
  Radio,
  Unlink,
  ExternalLink,
  RotateCcw,
  Copy,
  Check,
  Search,
  Loader2,
  Sparkles,
  Wifi,
  UserCheck,
  X,
  CreditCard,
} from 'lucide-react';
import hawiTapCardImg from '../../../assets/illustrations/Hawi Tap Card.png';
import hawiWavingImg from '../../../assets/illustrations/Hawi Waving.png';

export interface CardInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentRecord[];
  cardlessStudents: StudentRecord[];
  onQuickPair: (studentId: string, cardUid: string) => Promise<{ success: boolean; message: string }>;
  onUnlinkCard: (studentId: string, reason?: 'lost' | 'returned') => Promise<void>;
  onViewStudent: (student: StudentRecord) => void;
}

export const CardInspectorDrawer: React.FC<CardInspectorDrawerProps> = ({
  isOpen,
  onClose,
  students,
  cardlessStudents,
  onQuickPair,
  onUnlinkCard,
  onViewStudent,
}) => {
  const [scannedUid, setScannedUid] = useState('');
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [matchedStudent, setMatchedStudent] = useState<StudentRecord | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  // Quick Pair to Student
  const [studentSearchFilter, setStudentSearchFilter] = useState('');
  const [pairingStudentId, setPairingStudentId] = useState<string | null>(null);

  // Unlink Confirmation State
  const [isUnlinking, setIsUnlinking] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset & focus on open
  useEffect(() => {
    if (isOpen) {
      setScannedUid('');
      setActiveUid(null);
      setMatchedStudent(null);
      setStudentSearchFilter('');
      setPairingStudentId(null);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  // Lookup Card UID
  const inspectCard = async (rawUid: string) => {
    const clean = rawUid.trim().toUpperCase();
    if (!clean) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setActiveUid(clean);
    setIsSearching(true);
    setStudentSearchFilter('');

    // 1. Check in-memory list first (instant 0ms)
    const localMatch = students.find((s) => s.rfid_uid?.trim().toUpperCase() === clean);
    if (localMatch) {
      setMatchedStudent(localMatch);
      setIsSearching(false);
      return;
    }

    // 2. Query backend to check full student roster
    try {
      const res = await studentService.getStudents(1, clean);
      const backendStudents: StudentRecord[] = res?.students || [];
      const remoteMatch = backendStudents.find((s: StudentRecord) => s.rfid_uid?.trim().toUpperCase() === clean);
      setMatchedStudent(remoteMatch || null);
    } catch {
      setMatchedStudent(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (val: string) => {
    setScannedUid(val);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const clean = val.trim();
    // Auto-enter on burst scanner input (250ms debounce)
    if (clean.length >= 4) {
      debounceTimerRef.current = setTimeout(() => {
        void inspectCard(clean);
      }, 250);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void inspectCard(scannedUid);
  };

  const handleReset = () => {
    setScannedUid('');
    setActiveUid(null);
    setMatchedStudent(null);
    setStudentSearchFilter('');
    setPairingStudentId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    toast.success(`Copied ${uid} to clipboard!`);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handlePairStudent = async (studentId: string) => {
    if (!activeUid || pairingStudentId) return;
    setPairingStudentId(studentId);
    try {
      const res = await onQuickPair(studentId, activeUid);
      if (res?.success) {
        // Re-inspect to immediately display the paired student card
        await inspectCard(activeUid);
      }
    } finally {
      setPairingStudentId(null);
    }
  };

  const handleUnlinkSubmit = async () => {
    if (!matchedStudent || isUnlinking) return;
    setIsUnlinking(true);
    try {
      await onUnlinkCard(matchedStudent.id);
      toast.success(`Card ${activeUid} unlinked! It is now available to pair.`);
      setMatchedStudent(null);
    } finally {
      setIsUnlinking(false);
    }
  };

  // Filter cardless students for assignment list
  const filteredCardless = useMemo(() => {
    const q = studentSearchFilter.trim().toLowerCase();
    if (!q) return cardlessStudents;
    return cardlessStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.student_id.toLowerCase().includes(q) ||
        (s.course && s.course.toLowerCase().includes(q))
    );
  }, [cardlessStudents, studentSearchFilter]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Card Inspector"
      description="Tap any card to check ownership or pair with a student."
      icon={<Radio className="h-5 w-5 text-[#7C27BD]" />}
      maxWidth="lg"
    >
      <div className="flex flex-col h-full space-y-6 pt-1">
        {/* Sleek Auto-Sensing Scanner Bar */}
        <form onSubmit={handleFormSubmit} className="relative">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#7C27BD]">
              <Radio className={`h-4 w-4 ${isSearching ? 'animate-pulse text-[#A855F7]' : ''}`} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={scannedUid}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Tap physical card on reader..."
              className="w-full pl-10 pr-20 py-3 rounded-2xl border-2 border-brand-200/80 focus:border-[#7C27BD] bg-white text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all shadow-xs"
              autoFocus
            />
            {scannedUid && (
              <button
                type="button"
                onClick={handleReset}
                title="Clear input"
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        {/* STATE 0: Idle / Waiting for Card Tap */}
        {!activeUid && !isSearching && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-36 w-36 rounded-full bg-purple-100/50 animate-ping opacity-30 pointer-events-none" />
              <img
                src={hawiTapCardImg}
                alt="Hawi Tapping Card"
                className="h-36 w-auto object-contain drop-shadow-md select-none relative z-10"
              />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <p className="text-base font-black text-[#24133F]">Ready to Inspect</p>
              <p className="text-xs text-[#756883] leading-relaxed">
                Place any physical RFID tag on your USB reader. It will instantly reveal who it belongs to.
              </p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isSearching && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#7C27BD]" />
            <p className="text-xs font-bold text-[#756883]">Identifying card {activeUid}…</p>
          </div>
        )}

        {/* STATE 1: Card is Active & Paired to a Student */}
        {activeUid && !isSearching && matchedStudent && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
            {/* Visual RFID Card Graphic */}
            <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#7C27BD] via-[#8B2CCB] to-[#58158C] text-white shadow-[0_12px_28px_rgba(124,39,189,0.22)] select-none">
              {/* Decorative Card Ribbons */}
              <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-xl" />
              <div className="pointer-events-none absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-purple-400/20 blur-lg" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-purple-200" />
                  <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                    RFID Smart Card
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                    Active &amp; Linked
                  </span>
                </div>
              </div>

              {/* Contactless Wave Icon & UID */}
              <div className="relative z-10 my-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-purple-200/75">
                    Physical Tag UID
                  </p>
                  <p className="font-mono text-xl font-black tracking-wider text-white">
                    {activeUid}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyUid(activeUid)}
                  title="Copy UID"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                >
                  {copiedUid ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              {/* Card Footer Owner Name */}
              <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-200/75">
                    Cardholder
                  </p>
                  <p className="text-sm font-black truncate max-w-[220px]">
                    {matchedStudent.name}
                  </p>
                </div>
                <Wifi className="h-5 w-5 text-purple-300 rotate-90" />
              </div>
            </div>

            {/* Student Profile Quick View */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              {matchedStudent.avatar_url ? (
                <img
                  src={matchedStudent.avatar_url}
                  alt={matchedStudent.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-md select-none shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-purple-100 border-2 border-white shadow-md flex items-center justify-center shrink-0">
                  <img
                    src={hawiWavingImg}
                    alt="Student"
                    className="h-14 w-auto object-contain select-none"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-base font-black text-[#24133F] truncate">
                  {matchedStudent.name}
                </p>
                <p className="text-xs font-bold text-[#7C27BD]">
                  @{matchedStudent.student_id}
                </p>
                <p className="text-xs text-[#756883] truncate">
                  {matchedStudent.course || 'BS Information Technology'} • Year {matchedStudent.year_level || 1}
                </p>
              </div>
            </div>

            {/* Actions for Assigned Card */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleReset}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Scan Another
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  onClick={handleUnlinkSubmit}
                  isLoading={isUnlinking}
                  leftIcon={<Unlink className="h-4 w-4" />}
                >
                  Unlink Card
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => {
                    onClose();
                    onViewStudent(matchedStudent);
                  }}
                  leftIcon={<ExternalLink className="h-4 w-4" />}
                >
                  View Profile
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: Card is Available / Unassigned */}
        {activeUid && !isSearching && !matchedStudent && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
            {/* Visual Available Card Graphic */}
            <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)] select-none">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Unlinked Physical Tag
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  Available to Pair
                </div>
              </div>

              {/* UID */}
              <div className="relative z-10 my-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Card UID
                  </p>
                  <p className="font-mono text-xl font-black tracking-wider text-white">
                    {activeUid}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyUid(activeUid)}
                  title="Copy UID"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  {copiedUid ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs text-slate-400">
                <span>Ready for student assignment</span>
                <Wifi className="h-4 w-4 text-slate-400 rotate-90" />
              </div>
            </div>

            {/* Quick 1-Tap Student Assignment List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#24133F]">
                  <UserCheck className="h-4 w-4 text-[#7C27BD]" />
                  <span>Tap a student to pair immediately:</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {cardlessStudents.length} awaiting cards
                </span>
              </div>

              {/* Student Search Input */}
              {cardlessStudents.length > 0 && (
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearchFilter}
                    onChange={(e) => setStudentSearchFilter(e.target.value)}
                    placeholder="Search by student name or student ID..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
                  />
                </div>
              )}

              {/* List of Cardless Students */}
              {cardlessStudents.length > 0 ? (
                <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1">
                  {filteredCardless.length > 0 ? (
                    filteredCardless.map((student) => {
                      const isThisPairing = pairingStudentId === student.id;
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/30 transition-all shadow-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-900 truncate">
                              {student.name}
                            </p>
                            <p className="text-[11px] font-bold text-[#7C27BD]">
                              @{student.student_id} • {student.course || 'BSIT'}
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => void handlePairStudent(student.id)}
                            disabled={Boolean(pairingStudentId)}
                            isLoading={isThisPairing}
                            leftIcon={!isThisPairing ? <Sparkles className="h-3.5 w-3.5" /> : undefined}
                          >
                            Pair Card
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No cardless student matched &ldquo;{studentSearchFilter}&rdquo;
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-xs font-bold text-emerald-800">
                  All active students currently have assigned RFID cards!
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleReset}
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                >
                  Scan Another Card
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
