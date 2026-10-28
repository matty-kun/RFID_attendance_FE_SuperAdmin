import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
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
    uid: string
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
  const [lastScanned, setLastScanned] = useState<{
    uid: string;
    studentName: string;
    studentId: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
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

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const currentStudent = cardlessStudents[0];
  const upcomingStudents = cardlessStudents.slice(1, 4);

  const processScan = useCallback(
    async (rawUid: string) => {
      const clean = rawUid.trim().toUpperCase();
      if (!clean || isProcessingRef.current) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
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
      setInputValue('');

      // ⚡ INSTANT FEEDBACK (0ms):
      // Play success chime immediately upon physical card tap!
      soundManager.playSuccessBeep();
      setAssignedCount((prev) => prev + 1);
      setLastScanned({
        uid: clean,
        studentName: targetStudent.name,
        studentId: targetStudent.student_id,
      });

      // Auto-clear success banner after 1.8s so it doesn't linger
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setLastScanned(null);
      }, 1800);

      // Background card linking with optimistic update
      try {
        const res = await onCardScannedForStudent(targetStudent.id, clean);
        if (!res.success) {
          soundManager.playErrorBuzz();
          setAssignedCount((prev) => Math.max(0, prev - 1));
          setLastScanned(null);
        }
      } catch {
        soundManager.playErrorBuzz();
        setAssignedCount((prev) => Math.max(0, prev - 1));
        setLastScanned(null);
      } finally {
        isProcessingRef.current = false;
        inputRef.current?.focus();
      }
    },
    [currentStudent, students, onCardScannedForStudent]
  );

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
