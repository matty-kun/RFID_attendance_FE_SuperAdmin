import React, { useState, useEffect, useRef } from 'react';
import { Zap, Radio, CheckCircle2, AlertCircle, UserCheck } from 'lucide-react';
import { Drawer } from '../../../components/common/Drawer';
import { soundManager } from '../../../utils/audioFeedback';
import { toast } from '../../../context';
import hawiTapCardImg from '../../../assets/illustrations/Hawi Tap Card.png';
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
  const [batchHistory, setBatchHistory] = useState<Array<{ uid: string; label: string; time: string; success: boolean }>>([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setBatchHistory([]);
      setCurrentStudentIndex(0);
      setScanMode(cardlessStudents.length > 0 ? 'queue' : 'inventory');
      // Auto-focus listener
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, cardlessStudents.length]);

  // Keep focus on input for zero-click continuous card tapping
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rawUid = inputValue.trim();
      setInputValue(''); // Reset immediately for next card

      if (!rawUid) return;

      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (scanMode === 'inventory') {
        const res = onCardScannedForInventory(rawUid);
        if (res.success) {
          soundManager.playSuccessBeep();
          setBatchHistory((prev) => [
            { uid: rawUid, label: `Card #${res.cardNumber || prev.length + 1}`, time, success: true },
            ...prev,
          ]);
          toast.success(res.message);
        } else {
          soundManager.playErrorBuzz();
          setBatchHistory((prev) => [
            { uid: rawUid, label: `Duplicate / Rejected`, time, success: false },
            ...prev,
          ]);
          toast.error(res.message);
        }
      } else {
        // Queue Mode
        const targetStudent = cardlessStudents[currentStudentIndex];
        if (!targetStudent) {
          soundManager.playErrorBuzz();
          toast.info('All cardless students in queue have been assigned!');
          return;
        }

        const res = onCardScannedForStudent(targetStudent.id, rawUid);
        if (res.success) {
          soundManager.playSuccessBeep();
          setBatchHistory((prev) => [
            { uid: rawUid, label: `${targetStudent.name} (${targetStudent.student_id})`, time, success: true },
            ...prev,
          ]);
          toast.success(`Card linked to ${targetStudent.name}!`);
          setCurrentStudentIndex((prev) => prev + 1);
        } else {
          soundManager.playErrorBuzz();
          toast.error(res.message);
        }
      }
    }
  };

  const targetStudent = cardlessStudents[currentStudentIndex];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Rapid Card Scanner"
      description="Zero-click continuous tap mode. Just tap physical cards on your USB reader."
      icon={<Zap className="h-5 w-5 text-amber-500" />}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#756883]">
            {batchHistory.filter((b) => b.success).length} cards processed in this session
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#7026B7] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#631FA4] shadow-[0_4px_0_0_#451475] active:translate-y-[2px] active:shadow-none transition-all"
          >
            Done Scanning
          </button>
        </div>
      }
    >
      <div className="space-y-5" onClick={handleContainerClick}>
        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F6F4F8] p-1.5 border border-[#E5E0EB]">
          <button
            type="button"
            onClick={() => {
              setScanMode('inventory');
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className={`flex flex-col items-center justify-center rounded-xl py-2 px-3 transition-all ${
              scanMode === 'inventory'
                ? 'bg-white text-[#7026B7] shadow-xs font-bold'
                : 'text-[#756883] hover:text-[#24133F] font-semibold'
            }`}
          >
            <span className="text-xs font-bold">1. Scan to Card Inventory Pool</span>
            <span className="text-[10px] text-[#756883]">Pre-scan blank cards before distribution</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScanMode('queue');
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className={`flex flex-col items-center justify-center rounded-xl py-2 px-3 transition-all ${
              scanMode === 'queue'
                ? 'bg-white text-[#7026B7] shadow-xs font-bold'
                : 'text-[#756883] hover:text-[#24133F] font-semibold'
            }`}
          >
            <span className="text-xs font-bold">2. Stream to Students Queue</span>
            <span className="text-[10px] text-[#756883]">
              {cardlessStudents.length} students waiting for cards
            </span>
          </button>
        </div>

        {/* Live Tap Visual Box */}
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-b from-[#FBF8FE] to-[#F5EEFB] p-5 text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <img
              src={hawiTapCardImg}
              alt="Tap Card"
              className="h-24 w-24 object-contain mb-2 drop-shadow-md"
            />

            {scanMode === 'inventory' ? (
              <>
                <h4 className="text-base font-extrabold text-[#24133F]">
                  Tap Blank Card On Desktop Scanner
                </h4>
                <p className="text-xs text-[#756883] mt-1 max-w-sm">
                  Cards will be numbered sequentially in your inventory pool ({existingInventoryCount} total currently).
                </p>
              </>
            ) : (
              <>
                {targetStudent ? (
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-[#7026B7]">
                      Student #{currentStudentIndex + 1} of {cardlessStudents.length}
                    </span>
                    <h4 className="text-lg font-extrabold text-[#24133F]">
                      {targetStudent.name}
                    </h4>
                    <p className="text-xs text-[#756883]">
                      ID: <span className="font-bold text-[#24133F]">{targetStudent.student_id}</span> · {targetStudent.course}
                    </p>
                    <p className="text-xs text-[#7026B7] font-semibold animate-pulse pt-1">
                      ➔ Tap card on reader to bind to {targetStudent.name.split(' ')[0]}...
                    </p>
                  </div>
                ) : (
                  <div className="py-2">
                    <UserCheck className="h-8 w-8 text-emerald-600 mx-auto mb-1" />
                    <h4 className="text-sm font-bold text-emerald-800">Queue Complete!</h4>
                    <p className="text-xs text-emerald-700">All registered students now have active RFID cards.</p>
                  </div>
                )}
              </>
            )}

            {/* Hidden Input that captures USB Reader Keystrokes */}
            <div className="mt-4 w-full max-w-sm">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scanner listening for card taps..."
                  className="w-full rounded-xl border border-[#7026B7] bg-white py-2 pl-9 pr-3 text-xs font-mono font-bold text-[#24133F] text-center placeholder:text-[#A59AAB] focus:outline-none focus:ring-2 focus:ring-[#7026B7]/30"
                />
                <Radio className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7026B7] animate-pulse" />
              </div>
              <p className="mt-1 text-[10px] text-[#756883]">
                Zero-clicks needed. Each tap automatically submits &amp; advances.
              </p>
            </div>
          </div>
        </div>

        {/* Live Scan History Feed */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-[#F1EEF4]">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#756883]">
              Live Tap Feed ({batchHistory.length})
            </h5>
            {batchHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setBatchHistory([])}
                className="text-[11px] font-semibold text-[#7026B7] hover:underline"
              >
                Clear History
              </button>
            )}
          </div>

          <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {batchHistory.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between rounded-xl p-2.5 text-xs border transition-all ${
                  item.success
                    ? 'border-emerald-100 bg-emerald-50/50 text-emerald-950'
                    : 'border-rose-100 bg-rose-50/50 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">{item.label}</span>
                    <span className="ml-2 font-mono text-[11px] text-[#756883]">{item.uid}</span>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-[#756883]">{item.time}</span>
              </div>
            ))}

            {batchHistory.length === 0 && (
              <p className="py-6 text-center text-xs text-[#756883]">
                No cards scanned yet in this session. Start tapping on reader.
              </p>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
