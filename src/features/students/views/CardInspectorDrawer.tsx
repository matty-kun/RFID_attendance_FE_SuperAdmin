import React, { useState, useRef, useEffect } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Button } from '../../../components/common/Button';
import { toast } from '../../../context';
import { studentService } from '../services/studentService';
import type { StudentRecord } from '../models';
import {
  Radio,
  CheckCircle2,
  AlertCircle,
  Unlink,
  ExternalLink,
  RotateCcw,
  Copy,
  Check,
  UserCheck,
  Search,
  Loader2,
  Sparkles,
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

  // Quick Pair to Cardless Student State
  const [selectedStudentToPair, setSelectedStudentToPair] = useState<string>('');
  const [studentSearchFilter, setStudentSearchFilter] = useState('');
  const [isPairing, setIsPairing] = useState(false);

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
      setSelectedStudentToPair('');
      setStudentSearchFilter('');
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
    setSelectedStudentToPair('');
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
    setSelectedStudentToPair('');
    setStudentSearchFilter('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    toast.success(`Copied ${uid} to clipboard!`);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handlePairSubmit = async () => {
    if (!activeUid || !selectedStudentToPair || isPairing) return;
    setIsPairing(true);
    try {
      const res = await onQuickPair(selectedStudentToPair, activeUid);
      if (res?.success) {
        // Re-inspect to display updated owner
        await inspectCard(activeUid);
      }
    } finally {
      setIsPairing(false);
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

  // Filter cardless students for assignment dropdown
  const filteredCardless = cardlessStudents.filter((s) => {
    const q = studentSearchFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.student_id.toLowerCase().includes(q) ||
      (s.course && s.course.toLowerCase().includes(q))
    );
  });

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Inspect RFID Card"
      description="Tap any physical RFID card on your reader to reveal its owner or availability."
      icon={<Radio className="h-5 w-5 text-[#7C27BD]" />}
      maxWidth="lg"
    >
      <div className="space-y-6 pt-1">
        {/* Top Tap & Scan Bar */}
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
              placeholder="Tap card on reader or enter UID..."
              className="w-full pl-10 pr-24 py-3 rounded-2xl border-2 border-brand-200 focus:border-[#7C27BD] bg-white text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all shadow-xs"
              autoFocus
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              {activeUid && (
                <button
                  type="button"
                  onClick={handleReset}
                  title="Scan Another Card"
                  className="px-2 py-1 rounded-lg text-xs font-bold text-[#756883] hover:text-[#24133F] hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!scannedUid.trim() || isSearching}
              >
                {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Inspect'}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#756883] px-1 pt-1.5">
            <span>Auto-inspects on card tap</span>
            <span>Supports 13.56MHz &amp; 125kHz USB readers</span>
          </div>
        </form>

        {/* Dynamic State View */}
        {/* STATE 0: Idle / Waiting for tap */}
        {!activeUid && !isSearching && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
            <div className="relative">
              <div className="absolute -inset-6 rounded-full bg-purple-100/50 animate-ping opacity-25" />
              <img
                src={hawiTapCardImg}
                alt="Hawi Tapping Card"
                className="h-36 w-auto object-contain drop-shadow-md select-none relative z-10"
              />
            </div>
            <div className="space-y-1">
              <p className="text-base font-black text-[#24133F]">Ready for Card Tap</p>
              <p className="text-xs text-[#756883] max-w-sm leading-relaxed">
                Place physical RFID card on your desktop reader. It will instantly reveal who it belongs to or let you assign it.
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#7C27BD]" />
            <p className="text-xs font-bold text-[#756883]">Looking up card UID {activeUid}…</p>
          </div>
        )}

        {/* STATE 1: Card is Assigned to a Student */}
        {activeUid && !isSearching && matchedStudent && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold tracking-wide">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Card is Active &amp; Paired</span>
              </div>

              {/* UID with copy button */}
              <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#24133F] bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                <span>{activeUid}</span>
                <button
                  type="button"
                  onClick={() => handleCopyUid(activeUid)}
                  title="Copy UID"
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {copiedUid ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Student Details Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FAF8FD] to-white border border-[#E5E0EB] space-y-3 shadow-xs">
              <div className="flex items-center gap-3.5">
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
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-black text-[#24133F] truncate">
                    {matchedStudent.name}
                  </h4>
                  <p className="text-xs font-bold text-[#7C27BD]">
                    @{matchedStudent.student_id}
                  </p>
                  <p className="text-xs text-[#756883] truncate mt-0.5">
                    {matchedStudent.course || 'BS Information Technology'} • Year {matchedStudent.year_level || 1}
                  </p>
                </div>
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
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold tracking-wide">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>Card is Available / Unassigned</span>
              </div>

              {/* UID with copy button */}
              <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#24133F] bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                <span>{activeUid}</span>
                <button
                  type="button"
                  onClick={() => handleCopyUid(activeUid)}
                  title="Copy UID"
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {copiedUid ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-[#756883] leading-relaxed">
              This card UID is blank in the system. Tap another card or pair it with an unassigned student below.
            </p>

            {/* Quick 1-Click Assignment */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold text-[#24133F] flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-[#7C27BD]" />
                  <span>Assign this card to student:</span>
                </p>
                <span className="text-[11px] font-bold text-[#756883]">
                  {cardlessStudents.length} awaiting cards
                </span>
              </div>

              {cardlessStudents.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearchFilter}
                      onChange={(e) => setStudentSearchFilter(e.target.value)}
                      placeholder="Filter student by name or student ID..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <select
                    value={selectedStudentToPair}
                    onChange={(e) => setSelectedStudentToPair(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  >
                    <option value="">— Select a student to link this card —</option>
                    {filteredCardless.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.student_id}) — {student.course || 'BSIT'}
                      </option>
                    ))}
                  </select>

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

                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={() => void handlePairSubmit()}
                      disabled={!selectedStudentToPair || isPairing}
                      isLoading={isPairing}
                      leftIcon={<Sparkles className="h-4 w-4" />}
                    >
                      Link Card to Student
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-500">
                  All active students currently have assigned RFID cards.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
