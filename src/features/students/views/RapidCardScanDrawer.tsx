import React, { useState, useEffect, useRef } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { soundManager } from '../../../utils/audioFeedback';
import { toast } from '../../../context';
import hawiTapCardImg from '../../../assets/illustrations/Hawi Tap Card.png';
import hawiCelebrateImg from '../../../assets/illustrations/Hawi Celebrate.png';
import type { StudentRecord } from '../models';

export interface RapidCardScanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cardlessStudents: StudentRecord[];
  onCardScannedForStudent: (studentId: string, uid: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
}

export const RapidCardScanDrawer: React.FC<RapidCardScanDrawerProps> = ({
  isOpen,
  onClose,
  cardlessStudents,
  onCardScannedForStudent,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [batchHistory, setBatchHistory] = useState<
    Array<{ uid: string; label: string; time: string; success: boolean }>
  >([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setBatchHistory([]);
      setCurrentStudentIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, cardlessStudents.length]);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rawUid = inputValue.trim();
      setInputValue('');

      if (!rawUid) return;

      const time = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const targetStudent = cardlessStudents[currentStudentIndex];
      if (!targetStudent) {
        soundManager.playErrorBuzz();
        toast.info('All cardless students in queue have been assigned.');
        return;
      }

      const res = await onCardScannedForStudent(targetStudent.id, rawUid);
      if (res.success) {
        soundManager.playSuccessBeep();
        setBatchHistory((prev) => [
          { uid: rawUid, label: `${targetStudent.name} (${targetStudent.student_id})`, time, success: true },
          ...prev,
        ]);
        toast.success(`Card linked to ${targetStudent.name}`);
        setCurrentStudentIndex((prev) => prev + 1);
      } else {
        soundManager.playErrorBuzz();
        toast.error(res.message);
      }
    }
  };

  const currentStudent = cardlessStudents[currentStudentIndex];
  const upcomingStudents = cardlessStudents.slice(currentStudentIndex + 1, currentStudentIndex + 4);
  const remainingCount = Math.max(0, cardlessStudents.length - currentStudentIndex);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Rapid card scanner"
      description={`Continuous USB reader capture. ${remainingCount} student${remainingCount === 1 ? '' : 's'} awaiting cards.`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#756883] tabular-nums font-medium">
            {batchHistory.filter((b) => b.success).length} cards recorded this session
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#7026B7] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#621FA3] shadow-[0_4px_0_0_#451475] active:translate-y-[2px] active:shadow-none transition-all"
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
                  Assigning Student {currentStudentIndex + 1} of {cardlessStudents.length}
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
                    Year {currentStudent.year_level}
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
                          {currentStudentIndex + 2 + i}. {st.name}
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
            <div className="mb-1.5">
              <label htmlFor="usb-scanner-input" className="text-xs font-bold text-[#24133F]">
                USB scanner listener
              </label>
            </div>
            <input
              id="usb-scanner-input"
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tap physical RFID card on scanner..."
              className="w-full rounded-xl border border-[#D5CEDD] bg-[#FAF8FC] px-3.5 py-2.5 text-xs font-mono font-bold text-[#24133F] placeholder:text-[#A59AAB] focus:border-[#7026B7] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#756883]">
              Activity log ({batchHistory.length})
            </h4>
            {batchHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setBatchHistory([])}
                className="text-xs text-[#7026B7] font-semibold hover:underline"
              >
                Clear log
              </button>
            )}
          </div>

          <div className="rounded-xl border border-[#E5E0EB] bg-white divide-y divide-[#F1EEF4] max-h-48 overflow-y-auto">
            {batchHistory.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-[#24133F] truncate">{item.label}</p>
                  <p className="font-mono text-[11px] text-[#756883]">{item.uid}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[11px] font-bold ${
                      item.success ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {item.success ? 'Recorded' : 'Rejected'}
                  </span>
                  <span className="text-[11px] text-[#A59AAB] tabular-nums font-mono">
                    {item.time}
                  </span>
                </div>
              </div>
            ))}

            {batchHistory.length === 0 && (
              <p className="py-7 text-center text-xs text-[#756883]">
                No cards scanned in this session yet. Tap card on reader to start.
              </p>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
