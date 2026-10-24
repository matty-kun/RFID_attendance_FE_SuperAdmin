import React, { useState, useEffect, useRef } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Input } from '../../../components/common/Input';
import { soundManager } from '../../../utils/audioFeedback';
import { toast } from '../../../context';
import hawiTapCardImg from '../../../assets/illustrations/Hawi Tap Card.png';
import type { RegisterStudentPayload, InventoryCard } from '../models';

export interface AddStudentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableCards: InventoryCard[];
  onSubmit: (payload: RegisterStudentPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export const AddStudentDrawer: React.FC<AddStudentDrawerProps> = ({
  isOpen,
  onClose,
  availableCards,
  onSubmit,
  isSubmitting = false,
}) => {
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState('BS Information Technology');
  const [yearLevel, setYearLevel] = useState(1);
  const [cardMode, setCardMode] = useState<'scan' | 'inventory' | 'none'>('scan');
  const [scannedUid, setScannedUid] = useState('');
  const [selectedInventoryUid, setSelectedInventoryUid] = useState('');

  const scannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStudentId('');
      setName('');
      setEmail('');
      setCourse('BS Information Technology');
      setYearLevel(1);
      setScannedUid('');
      setSelectedInventoryUid(availableCards[0]?.uid || '');
      setCardMode(availableCards.length > 0 ? 'scan' : 'scan');
    }
  }, [isOpen, availableCards]);

  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = scannedUid.trim();
      if (val) {
        soundManager.playSuccessBeep();
        toast.success(`RFID card detected: ${val}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !name.trim() || !email.trim()) {
      toast.error('Please fill in all required student details.');
      return;
    }

    let finalUid: string | undefined = undefined;
    if (cardMode === 'scan' && scannedUid.trim()) {
      finalUid = scannedUid.trim();
    } else if (cardMode === 'inventory' && selectedInventoryUid) {
      finalUid = selectedInventoryUid;
    }

    await onSubmit({
      student_id: studentId.trim(),
      name: name.trim(),
      email: email.trim(),
      course,
      year_level: yearLevel,
      rfid_uid: finalUid,
    });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Register student"
      description="Create student profile and assign an RFID card before release."
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-[#7026B7] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#621FA3] shadow-[0_4px_0_0_#451475] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Registering...' : 'Register Student'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Basic Info */}
        <div className="space-y-3.5">
          <h3 className="text-xs font-semibold text-[#756883]">
            Student details
          </h3>

          <Input
            label="Institutional Student ID"
            placeholder="e.g. 2026-00045"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          />

          <Input
            label="Full Name"
            placeholder="e.g. Roberto Garcia"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Institutional Email"
            type="email"
            placeholder="e.g. roberto@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#24133F]">
                Academic program
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E0EB] text-xs font-medium text-[#24133F] bg-white focus:outline-none focus:border-[#7026B7]"
              >
                <option value="BS Information Technology">BS Information Technology</option>
                <option value="BS Computer Science">BS Computer Science</option>
                <option value="BS Information Systems">BS Information Systems</option>
                <option value="BS Computer Engineering">BS Computer Engineering</option>
                <option value="BS Business Administration">BS Business Administration</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#24133F]">
                Year level
              </label>
              <select
                value={yearLevel}
                onChange={(e) => setYearLevel(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E0EB] text-xs font-medium text-[#24133F] bg-white focus:outline-none focus:border-[#7026B7]"
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Physical RFID Card Binding with Hawi Personality */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] p-4 space-y-3.5">
          <div className="flex items-center gap-3">
            <img
              src={hawiTapCardImg}
              alt="Hawi Tap Card"
              className="h-12 w-12 shrink-0 object-contain drop-shadow-xs select-none"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#24133F]">
                  Assign physical RFID card
                </span>
                <span className="text-[11px] font-semibold text-[#7026B7]">
                  {availableCards.length} in pool
                </span>
              </div>
              <p className="text-[11px] text-[#756883] mt-0.5">
                Link now via USB reader or inventory card
              </p>
            </div>
          </div>

          {/* Mode Switcher: Clean segmented bar */}
          <div className="flex rounded-xl bg-white p-1 border border-[#E5E0EB]">
            <button
              type="button"
              onClick={() => {
                setCardMode('scan');
                setTimeout(() => scannerInputRef.current?.focus(), 50);
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                cardMode === 'scan'
                  ? 'bg-[#FAF8FC] text-[#7026B7] border border-[#7026B7]/20 shadow-xs'
                  : 'text-[#756883] hover:text-[#24133F]'
              }`}
            >
              Tap reader
            </button>
            <button
              type="button"
              onClick={() => setCardMode('inventory')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                cardMode === 'inventory'
                  ? 'bg-[#FAF8FC] text-[#7026B7] border border-[#7026B7]/20 shadow-xs'
                  : 'text-[#756883] hover:text-[#24133F]'
              }`}
            >
              From pool ({availableCards.length})
            </button>
            <button
              type="button"
              onClick={() => setCardMode('none')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                cardMode === 'none'
                  ? 'bg-slate-100 text-slate-800 shadow-xs'
                  : 'text-[#756883] hover:text-[#24133F]'
              }`}
            >
              Issue later
            </button>
          </div>

          {/* Mode Content */}
          {cardMode === 'scan' && (
            <div className="space-y-1.5">
              <input
                ref={scannerInputRef}
                type="text"
                placeholder="Tap physical card onto USB scanner..."
                value={scannedUid}
                onChange={(e) => setScannedUid(e.target.value)}
                onKeyDown={handleScannerKeyDown}
                className="w-full rounded-xl border border-[#D5CEDD] bg-white px-3.5 py-2 text-xs font-mono font-bold text-[#24133F] placeholder:text-[#A59AAB] focus:border-[#7026B7] focus:outline-none"
              />
              <p className="text-[11px] text-[#756883]">
                {scannedUid ? (
                  <span className="text-emerald-700 font-semibold">
                    Card UID captured: {scannedUid}
                  </span>
                ) : (
                  'Reader sends keystrokes automatically on card swipe.'
                )}
              </p>
            </div>
          )}

          {cardMode === 'inventory' && (
            <div className="space-y-1.5">
              {availableCards.length > 0 ? (
                <>
                  <select
                    value={selectedInventoryUid}
                    onChange={(e) => setSelectedInventoryUid(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E0EB] bg-white px-3 py-2 text-xs font-mono font-semibold text-[#24133F] focus:border-[#7026B7] focus:outline-none"
                  >
                    {availableCards.map((card) => (
                      <option key={card.id} value={card.uid}>
                        Card #{card.cardNumber} · {card.uid}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#756883]">
                    Selected card will be linked to this student immediately upon creation.
                  </p>
                </>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  No unassigned cards in pool. Switch to "Tap reader" to scan a new card directly.
                </p>
              )}
            </div>
          )}

          {cardMode === 'none' && (
            <p className="text-xs text-[#756883] p-2.5 bg-white rounded-xl border border-[#E5E0EB]">
              Student will be registered without a card. You can tap or assign one anytime.
            </p>
          )}
        </div>
      </form>
    </Drawer>
  );
};
