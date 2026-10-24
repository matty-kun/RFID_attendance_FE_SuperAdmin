import React, { useState, useEffect, useRef } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { soundManager } from '../../../utils/audioFeedback';
import { toast } from '../../../context';
import type { StudentRecord } from '../models';

export interface RapidCardScanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cardlessStudents: StudentRecord[];
  onCardScannedForInventory: (uid: string) => { success: boolean; message: string; cardNumber?: number };
  onCardScannedForStudent: (studentId: string, uid: string) => { success: boolean; message: string };
  existingInventoryCount: number;
}

export const RapidCardScanDrawer: React.FC<RapidCardScanDrawerProps> = ({
  isOpen,
  onClose,
  cardlessStudents,
  onCardScannedForInventory,
  onCardScannedForStudent,
  existingInventoryCount,
}) => {
  const [scanMode, setScanMode] = useState<'inventory' | 'queue'>('inventory');
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
      setScanMode(cardlessStudents.length > 0 ? 'queue' : 'inventory');
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, cardlessStudents.length]);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

      if (scanMode === 'inventory') {
        const res = onCardScannedForInventory(rawUid);
        if (res.success) {
          soundManager.playSuccessBeep();
          setBatchHistory((prev) => [
            { uid: rawUid, label: `Inventory #${res.cardNumber || prev.length + 1}`, time, success: true },
            ...prev,
          ]);
          toast.success(res.message);
        } else {
          soundManager.playErrorBuzz();
          setBatchHistory((prev) => [
            { uid: rawUid, label: 'Duplicate UID', time, success: false },
            ...prev,
          ]);
          toast.error(res.message);
        }
      } else {
        const targetStudent = cardlessStudents[currentStudentIndex];
        if (!targetStudent) {
          soundManager.playErrorBuzz();
          toast.info('All cardless students in queue have been assigned.');
          return;
        }

        const res = onCardScannedForStudent(targetStudent.id, rawUid);
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
      description="Continuous USB reader capture. Scans register and advance without mouse clicks."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#756883] tabular-nums">
            {batchHistory.filter((b) => b.success).length} cards recorded this session
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#24133F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#341C5B] transition-colors"
          >
            Done scanning
          </button>
        </div>
      }
    >
      <div className="space-y-5" onClick={handleContainerClick}>
        {/* Mode Switcher: Clean segmented track */}
        <div className="flex rounded-xl bg-[#F6F4F8] p-1 border border-[#E5E0EB]">
          <button
            type="button"
            onClick={() => {
              setScanMode('queue');
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs transition-all ${
              scanMode === 'queue'
                ? 'bg-white text-[#24133F] font-semibold shadow-xs'
                : 'text-[#756883] hover:text-[#24133F]'
            }`}
          >
            <span>Student queue</span>
            {cardlessStudents.length > 0 && (
              <span className="ml-1.5 text-[11px] text-[#756883] tabular-nums">
                ({remainingCount} pending)
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setScanMode('inventory');
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs transition-all ${
              scanMode === 'inventory'
                ? 'bg-white text-[#24133F] font-semibold shadow-xs'
                : 'text-[#756883] hover:text-[#24133F]'
            }`}
          >
            <span>Inventory pool</span>
            <span className="ml-1.5 text-[11px] text-[#756883] tabular-nums">
              ({existingInventoryCount} in pool)
            </span>
          </button>
        </div>

        {/* Operational Focus Workstation */}
        <div className="rounded-xl border border-[#E5E0EB] bg-white p-5 space-y-4">
          {scanMode === 'queue' ? (
            currentStudent ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#F1EEF4] pb-2.5">
                  <span className="text-xs text-[#756883]">
                    Assigning {currentStudentIndex + 1} of {cardlessStudents.length}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Waiting for card tap
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#24133F] tracking-tight">
                    {currentStudent.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#756883] mt-0.5">
                    <span className="font-mono text-[#24133F] font-medium">{currentStudent.student_id}</span>
                    <span>·</span>
                    <span>{currentStudent.course}</span>
                    <span>·</span>
                    <span>Year {currentStudent.year_level}</span>
                  </div>
                </div>

                {/* Queue preview: Next students in line */}
                {upcomingStudents.length > 0 && (
                  <div className="pt-2 border-t border-[#F1EEF4]">
                    <p className="text-[11px] font-medium text-[#756883] mb-1.5">Next in queue:</p>
                    <div className="space-y-1">
                      {upcomingStudents.map((st, i) => (
                        <div key={st.id} className="flex items-center justify-between text-xs text-[#756883]">
                          <span>
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
              <div className="py-6 text-center space-y-1">
                <p className="text-sm font-semibold text-[#16883F]">Queue complete</p>
                <p className="text-xs text-[#756883]">All students have been assigned RFID cards.</p>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#F1EEF4] pb-2.5">
                <span className="text-xs text-[#756883]">Card inventory intake</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Scanner listening
                </span>
              </div>
              <div>
                <p className="text-xs text-[#756883]">Total pool cards</p>
                <p className="text-2xl font-bold tracking-tight text-[#24133F] tabular-nums mt-0.5">
                  {existingInventoryCount + batchHistory.filter((b) => b.success).length}
                </p>
                <p className="text-xs text-[#756883] mt-1">
                  Each swipe registers a new sequential card into the unassigned pool.
                </p>
              </div>
            </div>
          )}

          {/* HID Keystroke Input Capture */}
          <div className="pt-2 border-t border-[#F1EEF4]">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="usb-scanner-input" className="text-xs font-medium text-[#756883]">
                USB scanner listener
              </label>
              <span className="text-[11px] text-[#A59AAB]">Focus retained automatically</span>
            </div>
            <input
              id="usb-scanner-input"
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tap physical card on scanner to record..."
              className="w-full rounded-xl border border-[#D5CEDD] bg-[#FAF8FC] px-3.5 py-2 text-xs font-mono font-medium text-[#24133F] placeholder:text-[#A59AAB] focus:border-[#7026B7] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-[#756883]">
              Activity log ({batchHistory.length})
            </h4>
            {batchHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setBatchHistory([])}
                className="text-xs text-[#756883] hover:text-[#24133F] hover:underline"
              >
                Clear log
              </button>
            )}
          </div>

          <div className="rounded-xl border border-[#E5E0EB] bg-white divide-y divide-[#F1EEF4] max-h-56 overflow-y-auto">
            {batchHistory.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-[#24133F] truncate">{item.label}</p>
                  <p className="font-mono text-[11px] text-[#756883]">{item.uid}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[11px] font-medium ${
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
              <p className="py-8 text-center text-xs text-[#756883]">
                No cards scanned in this session yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
