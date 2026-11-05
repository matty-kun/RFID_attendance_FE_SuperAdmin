import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, CreditCard } from 'lucide-react';
import { request } from '../../../services/apiClient';
import { Drawer, getOpenDrawerCount } from '../../../components/common/Drawer';
import { soundManager } from '../../../utils/audioFeedback';
import { toast } from '../../../context';
import { isValidRfidUid } from '../../../utils/rfid';
import hawiTapCardImg from '../../../assets/illustrations/Hawi Tap Card.png';
import hawiCelebrateImg from '../../../assets/illustrations/Hawi Celebrate.png';
import type { StudentRecord } from '../models';
import { formatYearLevel } from '../../../utils/formatters';

export interface RapidCardScanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  students?: StudentRecord[];
  cardlessStudents: StudentRecord[];
  onCardScannedForStudent: (
    studentId: string,
    uid: string,
    cardNumber?: string
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
}

export const RapidCardScanDrawer: React.FC<RapidCardScanDrawerProps> = ({
  isOpen,
  onClose,
  students,
  cardlessStudents,
  onCardScannedForStudent,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [assignedCount, setAssignedCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [lastScanned, setLastScanned] = useState<{
    uid: string;
    studentName: string;
    studentId: string;
  } | null>(null);
  const [pendingNewCard, setPendingNewCard] = useState<{
    student: StudentRecord;
    uid: string;
  } | null>(null);
  const [pendingCardNumberInput, setPendingCardNumberInput] = useState('');
  const newCardInputRef = useRef<HTMLInputElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const activeScanUidRef = useRef<string | null>(null);
  const lastAssignedStudentIdRef = useRef<string | null>(null);
  const pendingScansRef = useRef<string[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset & pre-warm audio context on open
  useEffect(() => {
    if (isOpen) {
      soundManager.init();
      setInputValue('');
      setAssignedCount(0);
      setLastScanned(null);
      isProcessingRef.current = false;
      activeScanUidRef.current = null;
      lastAssignedStudentIdRef.current = null;
      pendingScansRef.current = [];
      setIsProcessing(false);
      setQueuedCount(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => {
        clearTimeout(timer);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
      };
    }
  }, [isOpen]);

  // Global window listener: redirect hardware scanner keystrokes to inputRef if drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      // Do not redirect if another drawer is stacked on top
      if (getOpenDrawerCount() > 1) return;

      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'INPUT' && target !== inputRef.current) return;
      if (target && target.tagName === 'TEXTAREA') return;

      if (document.activeElement !== inputRef.current && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.length === 1 || e.key === 'Enter') {
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isOpen]);


  const handleConfirmNewCard = async () => {
    if (!pendingNewCard || !pendingCardNumberInput.trim() || isProcessing) return;
    const { student, uid } = pendingNewCard;
    const formattedNumber = pendingCardNumberInput.trim().toUpperCase();

    isProcessingRef.current = true;
    lastAssignedStudentIdRef.current = student.id;
    setIsProcessing(true);

    soundManager.playSuccessBeep();
    setAssignedCount((prev) => prev + 1);
    setLastScanned({
      uid,
      studentName: student.name,
      studentId: student.student_id,
    });

    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setLastScanned(null);
    }, 1800);

    setPendingNewCard(null);
    setPendingCardNumberInput('');

    try {
      const res = await onCardScannedForStudent(student.id, uid, formattedNumber);
      if (!res.success) {
        lastAssignedStudentIdRef.current = null;
        soundManager.playErrorBuzz();
        setAssignedCount((prev) => Math.max(0, prev - 1));
        setLastScanned(null);
      }
    } catch {
      lastAssignedStudentIdRef.current = null;
      soundManager.playErrorBuzz();
      setAssignedCount((prev) => Math.max(0, prev - 1));
      setLastScanned(null);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const currentStudent = cardlessStudents[0];
  const upcomingStudents = cardlessStudents.slice(1, 4);

  const processScan = useCallback(
    async (rawUid: string) => {
      const clean = rawUid.trim().toUpperCase();
      if (!clean) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Hold a second tap until the first card moves the student queue forward.
      if (isProcessingRef.current || currentStudent?.id === lastAssignedStudentIdRef.current) {
        if (clean !== activeScanUidRef.current && pendingScansRef.current.at(-1) !== clean) {
          pendingScansRef.current.push(clean);
          setQueuedCount(pendingScansRef.current.length);
        }
        setInputValue('');
        return;
      }

      const targetStudent = currentStudent;
      if (!targetStudent) {
        soundManager.playErrorBuzz();
        toast.info('All cardless students in queue have been assigned.');
        setInputValue('');
        return;
      }

      // Format validation (< 1ms)
      if (!isValidRfidUid(clean)) {
        soundManager.playErrorBuzz();
        toast.error('Invalid RFID card UID format.');
        setInputValue('');
        return;
      }

      // In-memory duplicate check (< 1ms)
      const duplicateStudent = students?.find(
        (s) => s.rfid_uid?.trim().toUpperCase() === clean && s.id !== targetStudent.id
      );
      if (duplicateStudent) {
        soundManager.playErrorBuzz();
        toast.error(`Card ${clean} is already assigned to ${duplicateStudent.name} (${duplicateStudent.student_id})!`);
        setInputValue('');
        return;
      }

      isProcessingRef.current = true;
      activeScanUidRef.current = clean;
      setIsProcessing(true);
      setInputValue('');

      // Check card registration status in inventory
      let cardLookup: { id: string; uid: string; card_number: string; status: string } | null = null;
      try {
        const res = await request.get<{ card: { id: string; uid: string; card_number: string; status: string } | null }>(
          `/cards/lookup/${encodeURIComponent(clean)}`
        );
        cardLookup = res?.card ?? null;
      } catch {
        // Continue
      }

      if (cardLookup) {
        if (cardLookup.status === 'issued') {
          soundManager.playErrorBuzz();
          toast.error(`Card ${cardLookup.card_number} is already issued to another student!`);
          isProcessingRef.current = false;
          activeScanUidRef.current = null;
          setIsProcessing(false);
          inputRef.current?.focus();
          return;
        }
        if (cardLookup.status === 'lost' || cardLookup.status === 'damaged') {
          soundManager.playErrorBuzz();
          toast.error(`Card ${cardLookup.card_number} is marked as ${cardLookup.status}!`);
          isProcessingRef.current = false;
          activeScanUidRef.current = null;
          setIsProcessing(false);
          inputRef.current?.focus();
          return;
        }

        // Available card in inventory: link directly!
        lastAssignedStudentIdRef.current = targetStudent.id;
        soundManager.playSuccessBeep();
        setAssignedCount((prev) => prev + 1);
        setLastScanned({
          uid: clean,
          studentName: targetStudent.name,
          studentId: targetStudent.student_id,
        });

        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => {
          setLastScanned(null);
        }, 1800);

        try {
          const res = await onCardScannedForStudent(targetStudent.id, clean, cardLookup.card_number);
          if (!res.success) {
            lastAssignedStudentIdRef.current = null;
            soundManager.playErrorBuzz();
            setAssignedCount((prev) => Math.max(0, prev - 1));
            setLastScanned(null);
          }
        } catch {
          lastAssignedStudentIdRef.current = null;
          soundManager.playErrorBuzz();
          setAssignedCount((prev) => Math.max(0, prev - 1));
          setLastScanned(null);
        } finally {
          isProcessingRef.current = false;
          activeScanUidRef.current = null;
          setIsProcessing(false);
          inputRef.current?.focus();
        }
      } else {
        // Brand new card: prompt for printed card number so it gets registered in rfid_cards
        setPendingNewCard({ student: targetStudent, uid: clean });
        setPendingCardNumberInput('');
        isProcessingRef.current = false;
        setIsProcessing(false);
        setTimeout(() => newCardInputRef.current?.focus(), 80);
      }
    },
    [currentStudent, students, onCardScannedForStudent]
  );

  useEffect(() => {
    if (!isOpen || isProcessing || !currentStudent || currentStudent.id === lastAssignedStudentIdRef.current) return;
    const nextUid = pendingScansRef.current.shift();
    if (!nextUid) return;
    setQueuedCount(pendingScansRef.current.length);
    void processScan(nextUid);
  }, [isOpen, isProcessing, currentStudent, queuedCount, processScan]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Auto-detect fast hardware scanner typing (e.g. 10 digits decimal or standard hex)
    const clean = val.trim().toUpperCase();
    if (isValidRfidUid(clean) && (clean.length === 10 || clean.length === 8)) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void processScan(clean);
      }, 40);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rawUid = (e.currentTarget.value || inputValue).trim();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      void processScan(rawUid);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Rapid card scanner"
      description={`Continuous USB reader capture. ${cardlessStudents.length} student${cardlessStudents.length === 1 ? '' : 's'} awaiting cards.`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#756883] tabular-nums font-medium">
            {assignedCount} card{assignedCount === 1 ? '' : 's'} assigned this session
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#7026B7] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#621FA3] shadow-[0_4px_0_0_#451475] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
          >
            Done Scanning
          </button>
        </div>
      }
    >
      <div className="space-y-4" onClick={handleContainerClick}>
        {/* Modal-like prompt if new card detected */}
        {pendingNewCard && (
          <div className="rounded-2xl border-2 border-[#7026B7] bg-purple-50/70 p-4 sm:p-5 space-y-3.5 animate-in fade-in zoom-in-95 duration-150 shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7026B7] text-white">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#24133F]">New Physical Card Scanned</h4>
                <p className="text-[11px] font-mono text-purple-700 font-bold mt-0.5">UID: {pendingNewCard.uid}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-[#24133F]">
                Assigning to: <span className="font-extrabold text-[#7026B7]">{pendingNewCard.student.name}</span> ({pendingNewCard.student.student_id})
              </p>
              <label className="block text-[11px] font-bold text-[#7026B7] mt-2 mb-1">
                Printed Card Number *
              </label>
              <input
                ref={newCardInputRef}
                type="text"
                autoFocus
                value={pendingCardNumberInput}
                onChange={(e) => setPendingCardNumberInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleConfirmNewCard();
                  } else if (e.key === 'Escape') {
                    setPendingNewCard(null);
                    setPendingCardNumberInput('');
                    inputRef.current?.focus();
                  }
                }}
                placeholder="e.g. RFID-001"
                className="w-full rounded-xl border border-purple-300 bg-white px-3.5 py-2.5 text-xs font-mono font-bold uppercase text-[#24133F] focus:border-[#7026B7] focus:outline-none focus:ring-4 focus:ring-purple-100"
              />
              <p className="text-[10px] text-[#756883] mt-1">
                Enter the number printed on this card so it registers in the RFID Cards page.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-purple-200/70">
              <button
                type="button"
                onClick={() => {
                  setPendingNewCard(null);
                  setPendingCardNumberInput('');
                  inputRef.current?.focus();
                }}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pendingCardNumberInput.trim() || isProcessing}
                onClick={() => void handleConfirmNewCard()}
                className="rounded-xl bg-[#7026B7] px-4 py-2 text-xs font-bold text-white hover:bg-[#621FA3] disabled:opacity-50 transition-colors cursor-pointer"
              >
                Register & Bind Card
              </button>
            </div>
          </div>
        )}

        {/* Operational Focus Workstation with Hawi Personality */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4 sm:p-5 space-y-4">
          {currentStudent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#F1EEF4] pb-2.5">
                <span className="text-xs font-semibold text-[#756883]">
                  {cardlessStudents.length} student{cardlessStudents.length === 1 ? '' : 's'} remaining
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Waiting for card tap
                </span>
              </div>

              {/* Hawi side-by-side with student target */}
              <div className="flex items-center gap-4">
                <img
                  src={hawiTapCardImg}
                  alt="Hawi Tapping Card"
                  className="h-20 w-20 shrink-0 object-contain drop-shadow-sm select-none"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#24133F] tracking-tight leading-snug truncate">
                    {currentStudent.name}
                  </h3>
                  <p className="text-xs text-[#756883] font-medium mt-0.5">
                    <span className="font-mono text-[#24133F] font-bold">{currentStudent.student_id}</span>
                    {' · '}
                    {currentStudent.course}
                    {' · '}
                    {formatYearLevel(currentStudent.year_level)}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F4EFFB] text-[11px] font-bold text-[#7026B7]">
                    <span>Tap card on USB reader to bind</span>
                  </div>
                </div>
              </div>

              {/* Queue preview: Next students in line */}
              {upcomingStudents.length > 0 && (
                <div className="pt-2.5 border-t border-[#F1EEF4]">
                  <p className="text-[11px] font-semibold text-[#756883] mb-1.5">Next in line:</p>
                  <div className="space-y-1">
                    {upcomingStudents.map((st, i) => (
                      <div key={st.id} className="flex items-center justify-between text-xs text-[#756883]">
                        <span className="font-medium text-[#24133F]">
                          {i + 2}. {st.name}
                        </span>
                        <span className="font-mono text-[11px] text-[#A59AAB]">{st.student_id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 flex items-center gap-4 text-left">
              <img
                src={hawiCelebrateImg}
                alt="Hawi Celebrate"
                className="h-16 w-16 shrink-0 object-contain select-none"
              />
              <div>
                <h4 className="text-sm font-bold text-[#16883F]">Queue complete!</h4>
                <p className="text-xs text-[#756883] mt-0.5">
                  All active students have been assigned physical RFID cards.
                </p>
              </div>
            </div>
          )}

          {/* HID Keystroke Input Capture */}
          <div className="pt-2 border-t border-[#F1EEF4]">
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="usb-scanner-input" className="text-xs font-bold text-[#24133F]">
                USB scanner listener
              </label>
              <span className="text-[11px] text-[#756883]">Auto-captures hardware taps</span>
            </div>
            <input
              id="usb-scanner-input"
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Tap physical RFID card on scanner..."
              className="w-full rounded-xl border border-[#D5CEDD] bg-[#FAF8FC] px-3.5 py-2.5 text-xs font-mono font-bold text-[#24133F] placeholder:text-[#A59AAB] focus:border-[#7026B7] focus:bg-white focus:outline-none transition-colors"
            />
            {lastScanned && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2.5 text-xs text-emerald-900 animate-in fade-in duration-150 transition-all">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">
                      Card linked to {lastScanned.studentName}
                    </p>
                    <p className="font-mono text-[11px] text-emerald-700 mt-0.5">
                      UID: <span className="font-bold">{lastScanned.uid}</span> · ID: {lastScanned.studentId}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                  Linked ✓
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default RapidCardScanDrawer;
