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
  Copy,
  Check,
  Search,
  Loader2,
  X,
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
  const lastInputTimeRef = useRef<number>(0);

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

  // Global window listener: redirect hardware scanner keystrokes to inputRef if drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Do not redirect if user is actively typing in studentSearchFilter
      if (target && target.tagName === 'INPUT' && target !== inputRef.current) {
        return;
      }
      if (target && target.tagName === 'TEXTAREA') {
        return;
      }
      if (document.activeElement !== inputRef.current && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.length === 1 || e.key === 'Enter') {
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
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

    // Ensure the input has the inspected UID and select it so the next scan overwrites immediately
    setScannedUid(clean);
    setTimeout(() => {
      inputRef.current?.select();
    }, 50);

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

  const handleInputChange = (rawVal: string) => {
    const now = Date.now();
    const timeDelta = now - lastInputTimeRef.current;
    lastInputTimeRef.current = now;

    let nextVal = rawVal;

    // If a card was already inspected or active on screen,
    // and a new scan begins after a pause (> 300ms):
    if (activeUid && timeDelta > 300) {
      // Instantly erase previous card state and student info
      setActiveUid(null);
      setMatchedStudent(null);
      setStudentSearchFilter('');

      // Extract new character(s) if text was appended to old UID
      if (rawVal.startsWith(scannedUid) && rawVal.length > scannedUid.length) {
        nextVal = rawVal.slice(scannedUid.length);
      } else if (rawVal.endsWith(scannedUid) && rawVal.length > scannedUid.length) {
        nextVal = rawVal.slice(0, rawVal.length - scannedUid.length);
      } else if (rawVal.length > 10) {
        nextVal = rawVal.slice(-10);
      }
    } else if (nextVal.length > 10) {
      // If RFID burst appended to existing 10 digits without selection, take the latest 10
      nextVal = nextVal.slice(-10);
    }

    setScannedUid(nextVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const clean = nextVal.trim();

    // Standard RFID card UID length: auto-enter IMMEDIATELY with 0ms delay
    if (clean.length === 10) {
      void inspectCard(clean);
      return;
    }

    // Auto-enter on burst scanner input (250ms debounce) for other UID lengths
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
            {/* Scanned Tag Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active &amp; Linked
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">Physical Tag</span>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="font-mono text-2xl font-black tracking-wide text-[#24133F]">
                    {activeUid}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyUid(activeUid)}
                    title="Copy UID"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {copiedUid ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Student Identity (Unboxed) */}
            <div className="pt-4 pb-2 border-t border-slate-100 flex items-center gap-4">
              {matchedStudent.avatar_url ? (
                <img
                  src={matchedStudent.avatar_url}
                  alt={matchedStudent.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-purple-100 shadow-xs shrink-0 select-none"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-purple-50 border-2 border-purple-100 flex items-center justify-center shrink-0">
                  <img
                    src={hawiWavingImg}
                    alt="Student"
                    className="h-12 w-auto object-contain select-none"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#24133F] truncate">
                    {matchedStudent.name}
                  </h3>
                  <span className="text-xs font-bold text-[#7C27BD] bg-purple-50 px-2 py-0.5 rounded-full">
                    @{matchedStudent.student_id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {matchedStudent.course || 'BS Information Technology'} • Year {matchedStudent.year_level || 1}
                </p>
                {matchedStudent.email && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {matchedStudent.email}
                  </p>
                )}
              </div>
            </div>

            {/* Actions for Assigned Card */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
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
        )}

        {/* STATE 2: Card is Available / Unassigned */}
        {activeUid && !isSearching && !matchedStudent && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
            {/* Available Tag Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Available to Pair
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">Unassigned Tag</span>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="font-mono text-2xl font-black tracking-wide text-[#24133F]">
                    {activeUid}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyUid(activeUid)}
                    title="Copy UID"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {copiedUid ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 pt-0.5">
                  Tag ready. Pick a student below to instantly link.
                </p>
              </div>
            </div>

            {/* Quick 1-Tap Student Assignment List */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Students Awaiting Cards ({cardlessStudents.length})
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
                    placeholder="Filter by name or ID..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              )}

              {/* List of Cardless Students */}
              {cardlessStudents.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                  {filteredCardless.length > 0 ? (
                    filteredCardless.map((student) => {
                      const isThisPairing = pairingStudentId === student.id;
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between py-2.5 px-1 hover:bg-slate-50 rounded-xl transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-900 truncate">
                              {student.name}
                            </p>
                            <p className="text-[11px] font-medium text-slate-500">
                              @{student.student_id} • {student.course || 'BSIT'} • Year {student.year_level || 1}
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => void handlePairStudent(student.id)}
                            disabled={Boolean(pairingStudentId)}
                            isLoading={isThisPairing}
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
                <div className="py-6 text-center text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl">
                  All active students currently have assigned RFID cards!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
