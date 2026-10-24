import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Dropdown } from '../../../components/common/Dropdown';
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
  const [cardMode, setCardMode] = useState<'scan' | 'inventory'>('scan');
  const [scannedUid, setScannedUid] = useState('');
  const [selectedInventoryUid, setSelectedInventoryUid] = useState('');

  const scannerInputRef = useRef<HTMLInputElement>(null);

  const courseOptions = useMemo(
    () => [
      { value: 'BS Information Technology', label: 'BS Information Technology' },
      { value: 'BS Computer Science', label: 'BS Computer Science' },
      { value: 'BS Information Systems', label: 'BS Information Systems' },
      { value: 'BS Computer Engineering', label: 'BS Computer Engineering' },
      { value: 'BS Business Administration', label: 'BS Business Administration' },
    ],
    []
  );

  const yearLevelOptions = useMemo(
    () => [
      { value: '1', label: '1st Year' },
      { value: '2', label: '2nd Year' },
      { value: '3', label: '3rd Year' },
      { value: '4', label: '4th Year' },
    ],
    []
  );

  const inventoryOptions = useMemo(
    () =>
      availableCards.map((card) => ({
        value: card.uid,
        label: `Card #${card.cardNumber} · ${card.uid}`,
      })),
    [availableCards]
  );

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
      const timer = setTimeout(() => scannerInputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
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

  const handleRegisterWithCard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentId.trim() || !name.trim() || !email.trim()) {
      toast.error('Please fill in Student ID, Name, and Email.');
      return;
    }

    let finalUid: string | undefined = undefined;
    if (cardMode === 'scan') {
      if (!scannedUid.trim()) {
        toast.error('Tap card on scanner or click "Register without card".');
        scannerInputRef.current?.focus();
        return;
      }
      finalUid = scannedUid.trim();
    } else if (cardMode === 'inventory') {
      if (!selectedInventoryUid) {
        toast.error('Select a card from pool or click "Register without card".');
        return;
      }
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

  const handleRegisterWithoutCard = async () => {
    if (!studentId.trim() || !name.trim() || !email.trim()) {
      toast.error('Please fill in Student ID, Name, and Email.');
      return;
    }

    await onSubmit({
      student_id: studentId.trim(),
      name: name.trim(),
      email: email.trim(),
      course,
      year_level: yearLevel,
      rfid_uid: undefined,
    });
  };

  const hasCardSelected = (cardMode === 'scan' && Boolean(scannedUid.trim())) || (cardMode === 'inventory' && Boolean(selectedInventoryUid));

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Register student"
      description="Tap an RFID card to bind, then enter student details."
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRegisterWithoutCard}
            disabled={isSubmitting}
            className="rounded-xl border border-[#E5E0EB] bg-white px-4 py-2.5 text-xs font-semibold text-[#756883] hover:bg-slate-50 hover:text-[#24133F] transition-colors disabled:opacity-50"
          >
            Issue card later
          </button>

          <button
            type="button"
            onClick={handleRegisterWithCard}
            disabled={isSubmitting}
            className="rounded-xl bg-[#7026B7] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#621FA3] shadow-[0_4px_0_0_#451475] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
          >
            {isSubmitting
              ? 'Registering...'
              : hasCardSelected
              ? 'Register & Link Card'
              : 'Register Student'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleRegisterWithCard} className="space-y-5">
        {/* TOP SECTION: RFID Card Binding Station (matches RapidCardScanDrawer clean white surface) */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4 space-y-3.5">
          <div className="flex items-center gap-3">
            <img
              src={hawiTapCardImg}
              alt="Hawi Tap Card"
              className="h-12 w-12 shrink-0 object-contain drop-shadow-xs select-none"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#24133F]">
                  Physical RFID card
                </span>
                <span className="text-[11px] font-semibold text-[#7026B7]">
                  {availableCards.length} ready in pool
                </span>
              </div>
              <p className="text-[11px] text-[#756883] mt-0.5">
                Tap scanner now or assign from available inventory
              </p>
            </div>
          </div>

          {/* Mode Switcher: Clean segmented bar matching RapidCardScanDrawer */}
          <div className="flex rounded-xl bg-[#F6F4F8] p-1 border border-[#E5E0EB]">
            <button
              type="button"
              onClick={() => {
                setCardMode('scan');
                setTimeout(() => scannerInputRef.current?.focus(), 50);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                cardMode === 'scan'
                  ? 'bg-white text-[#7026B7] font-bold shadow-xs'
                  : 'text-[#756883] hover:text-[#24133F]'
              }`}
            >
              Tap reader
            </button>
            <button
              type="button"
              onClick={() => setCardMode('inventory')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                cardMode === 'inventory'
                  ? 'bg-white text-[#7026B7] font-bold shadow-xs'
                  : 'text-[#756883] hover:text-[#24133F]'
              }`}
            >
              From pool ({availableCards.length})
            </button>
          </div>

          {/* Mode 1: USB Reader Capture */}
          {cardMode === 'scan' && (
            <div className="space-y-1.5">
              <input
                ref={scannerInputRef}
                type="text"
                placeholder="Tap card on USB desktop scanner..."
                value={scannedUid}
                onChange={(e) => setScannedUid(e.target.value)}
                onKeyDown={handleScannerKeyDown}
                className="w-full rounded-xl border border-[#D5CEDD] bg-[#FAF8FC] px-3.5 py-2.5 text-xs font-mono font-bold text-[#24133F] placeholder:text-[#A59AAB] focus:border-[#7026B7] focus:bg-white focus:outline-none"
              />
              <p className="text-[11px] text-[#756883]">
                {scannedUid ? (
                  <span className="text-emerald-700 font-semibold">
                    ✓ Card detected: {scannedUid}
                  </span>
                ) : (
                  'Scanner captures card keystroke automatically on swipe.'
                )}
              </p>
            </div>
          )}

          {/* Mode 2: Select from Pool */}
          {cardMode === 'inventory' && (
            <div className="space-y-1.5">
              {availableCards.length > 0 ? (
                <>
                  <Dropdown
                    value={selectedInventoryUid}
                    onChange={(val) => setSelectedInventoryUid(val)}
                    options={inventoryOptions}
                    placeholder="Select card from pool"
                    className="w-full"
                    buttonClassName="w-full h-10 px-3 text-xs font-mono font-bold text-[#24133F]"
                  />
                  <p className="text-[11px] text-[#756883]">
                    Selected card will be linked upon registration.
                  </p>
                </>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  No cards in pool. Switch to "Tap reader" to swipe a new card.
                </p>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: Student Details */}
        <div className="space-y-3.5 pt-1">
          <h3 className="text-xs font-semibold text-[#756883]">
            Student details
          </h3>

          <Input
            label="Student ID"
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
            label="Email Address"
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
              <Dropdown
                value={course}
                onChange={(val) => setCourse(val)}
                options={courseOptions}
                placeholder="Select program"
                className="w-full"
                buttonClassName="w-full h-10 px-3 text-xs font-medium text-[#24133F]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#24133F]">
                Year level
              </label>
              <Dropdown
                value={String(yearLevel)}
                onChange={(val) => setYearLevel(Number(val))}
                options={yearLevelOptions}
                placeholder="Select year"
                className="w-full"
                buttonClassName="w-full h-10 px-3 text-xs font-medium text-[#24133F]"
              />
            </div>
          </div>
        </div>
      </form>
    </Drawer>
  );
};
