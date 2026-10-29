import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Drawer, getOpenDrawerCount } from '../../../components/common/Drawer';
import { Button } from '../../../components/common/Button';
import { studentService } from '../services/studentService';
import type { StudentRecord } from '../models';
import { formatYearLevel } from '../../../utils/formatters';
import { isValidRfidUid } from '../../../utils/rfid';
import { soundManager } from '../../../utils/audioFeedback';
import {
  Radio,
  ExternalLink,
  Search,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import hawiTapCardImg from '../../../assets/illustrations/Hawi Tap Card.png';
import hawiWavingImg from '../../../assets/illustrations/Hawi Waving.png';

export interface CardInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentRecord[];
  cardlessStudents: StudentRecord[];
  onQuickPair: (studentId: string, cardUid: string) => Promise<{ success: boolean; message: string }>;
  onUnlinkCard?: (studentId: string, reason?: 'lost' | 'returned') => Promise<void>;
  onViewStudent: (student: StudentRecord) => void;
}

export const CardInspectorDrawer: React.FC<CardInspectorDrawerProps> = ({
  isOpen,
  onClose,
  students,
  cardlessStudents,
  onQuickPair,
  onViewStudent,
}) => {
  const [scannedUid, setScannedUid] = useState('');
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [matchedStudent, setMatchedStudent] = useState<StudentRecord | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Quick Pair to Student
  const [studentSearchFilter, setStudentSearchFilter] = useState('');
  const [pairingStudentId, setPairingStudentId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scanRequestIdRef = useRef(0);
  const lastInspectedUidRef = useRef<string | null>(null);

  // Reset & focus on open
  useEffect(() => {
    if (isOpen) {
      scanRequestIdRef.current += 1;
      lastInspectedUidRef.current = null;
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
      // Do not redirect if another drawer is stacked on top
      if (getOpenDrawerCount() > 1) return;

      // Do not redirect if user is actively typing in studentSearchFilter
      const target = e.target as HTMLElement | null;
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
  const inspectCard = async (rawUid: string, force = false) => {
    const clean = rawUid.trim().toUpperCase();
    if (!clean) return;
    if (!force && lastInspectedUidRef.current === clean) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!isValidRfidUid(clean)) {
      scanRequestIdRef.current += 1;
      lastInspectedUidRef.current = null;
      setValidationError('Invalid card UID format. Tap a physical RFID card or enter a 10-digit UID.');
      setActiveUid(null);
      setMatchedStudent(null);
      setIsSearching(false);
      soundManager.playErrorBuzz();
      return;
    }

    const requestId = ++scanRequestIdRef.current;
    lastInspectedUidRef.current = clean;
    setValidationError(null);
    setActiveUid(clean);
    setIsSearching(true);
    setStudentSearchFilter('');

    // Keep the inspected UID visible without highlighting it.
    setScannedUid(clean);

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
      if (requestId === scanRequestIdRef.current) setMatchedStudent(remoteMatch || null);
    } catch {
      if (requestId === scanRequestIdRef.current) setMatchedStudent(null);
    } finally {
      if (requestId === scanRequestIdRef.current) setIsSearching(false);
    }
  };

  const handleInputChange = (rawVal: string) => {
    let nextVal = rawVal;

    // When a new scan appends to the previous UID, keep only the new burst.
    if (activeUid && nextVal.length > 10) {
      // The old UID is still in the input and new digits got appended.
      // Extract only the new trailing characters.
      if (nextVal.startsWith(scannedUid)) {
        nextVal = nextVal.slice(scannedUid.length);
      } else if (nextVal.endsWith(scannedUid)) {
        nextVal = nextVal.slice(0, nextVal.length - scannedUid.length);
      } else {
        nextVal = nextVal.slice(-10);
      }

      // Clear old state immediately for the new scan
      setActiveUid(null);
      setMatchedStudent(null);
      setStudentSearchFilter('');
    } else if (!activeUid && nextVal.length > 10) {
      // If RFID burst appended without prior selection, take latest 10
      nextVal = nextVal.slice(-10);
    }

    if (nextVal !== scannedUid) {
      lastInspectedUidRef.current = null;
      scanRequestIdRef.current += 1;
    }
    setScannedUid(nextVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const clean = nextVal.trim();

    // Standard 10-digit RFID card UID: auto-enter IMMEDIATELY with 0ms delay
    if (clean.length === 10 && /^\d{10}$/.test(clean)) {
      void inspectCard(clean);
      return;
    }

    // Auto-enter only if input matches valid physical RFID format
    if (isValidRfidUid(clean)) {
      debounceTimerRef.current = setTimeout(() => {
        void inspectCard(clean);
      }, 250);
    } else if (activeUid) {
      // Clear previous active card state if user edits to non-RFID text
      setActiveUid(null);
      setMatchedStudent(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = scannedUid.trim();
    if (!clean) return;
    if (!isValidRfidUid(clean)) {
      setValidationError('Invalid card UID format. Tap a physical RFID card or enter a 10-digit UID.');
      setActiveUid(null);
      setMatchedStudent(null);
      soundManager.playErrorBuzz();
      return;
    }
    void inspectCard(clean);
  };

  const handleReset = () => {
    scanRequestIdRef.current += 1;
    lastInspectedUidRef.current = null;
    setScannedUid('');
    setActiveUid(null);
    setMatchedStudent(null);
    setValidationError(null);
    setStudentSearchFilter('');
    setPairingStudentId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handlePairStudent = async (studentId: string) => {
    if (!activeUid || pairingStudentId) return;
    setPairingStudentId(studentId);
    try {
      const res = await onQuickPair(studentId, activeUid);
      if (res?.success) {
        // Re-inspect to immediately display the paired student card
        await inspectCard(activeUid, true);
      }
    } finally {
      setPairingStudentId(null);
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
      <div className="flex min-h-full flex-col space-y-6 pt-1 pb-6">
        {/* Sleek Auto-Sensing Scanner Bar */}
        <div className="space-y-2">
          <form onSubmit={handleFormSubmit} className="relative">
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none">
                <Radio
                  className={`h-4 w-4 transition-colors ${
                    validationError
                      ? 'text-[#EF3340]'
                      : isSearching
                      ? 'animate-pulse text-[#A855F7]'
                      : 'text-[#7C27BD]'
                  }`}
                />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={scannedUid}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Tap physical card on reader..."
                className={`w-full pl-10 pr-20 py-3 rounded-2xl border-2 bg-white text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none transition-all shadow-xs ${
                  validationError
                    ? 'border-[#EF3340] focus:border-[#EF3340] focus:ring-4 focus:ring-red-100'
                    : 'border-[#D8B4ED] focus:border-[#7C27BD] focus:ring-4 focus:ring-purple-100'
                }`}
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

          {/* Validation Error Banner */}
          {validationError && (
            <div className="flex items-center gap-2 rounded-2xl bg-[#FDE8EA] border border-[#EF3340]/20 px-3.5 py-2.5 text-xs font-bold text-[#B91C2A] animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#EF3340]" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* STATE 0: Idle / Waiting for Card Tap */}
        {!activeUid && !isSearching && !validationError && (
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
          <div className="pt-1 animate-in fade-in slide-in-from-right-3 duration-200">
            {/* Student Identity with Inline View Profile */}
            <div className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-3.5 min-w-0">
                {matchedStudent.avatar_url ? (
                  <img
                    src={matchedStudent.avatar_url}
                    alt={matchedStudent.name}
                    className="h-14 w-14 rounded-full object-cover border-2 border-purple-100 shadow-xs shrink-0 select-none"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-purple-50 border-2 border-purple-100 flex items-center justify-center shrink-0">
                    <img
                      src={hawiWavingImg}
                      alt="Student"
                      className="h-11 w-auto object-contain select-none"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-[#24133F] truncate">
                      {matchedStudent.name}
                    </h3>
                    <span className="text-xs font-bold text-[#7C27BD] bg-purple-50 px-2.5 py-0.5 rounded-full shrink-0">
                      @{matchedStudent.student_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {matchedStudent.course || 'BS Information Technology'} • {formatYearLevel(matchedStudent.year_level || 1)}
                  </p>
                  {matchedStudent.email && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {matchedStudent.email}
                    </p>
                  )}
                </div>
              </div>

              {/* View Profile Action */}
              <div className="shrink-0">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onViewStudent(matchedStudent);
                  }}
                  leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                >
                  View Profile
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: Card is Available / Unassigned */}
        {activeUid && !isSearching && !matchedStudent && isValidRfidUid(activeUid) && (
          <div className="shrink-0 space-y-4 pt-1 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Available to Pair
              </span>
              <span className="text-xs text-slate-500">Pick a student below to link</span>
            </div>

            {/* Quick 1-Tap Student Assignment List */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
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
                <div className="divide-y divide-slate-100 pr-1">
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
                              @{student.student_id} • {student.course || 'BSIT'} • {formatYearLevel(student.year_level || 1)}
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
