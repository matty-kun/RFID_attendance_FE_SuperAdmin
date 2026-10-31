import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Dropdown } from '../../../components/common/Dropdown';
import { Input } from '../../../components/common/Input';
import { Eye, EyeOff, Sparkles, Trash2 } from 'lucide-react';
import { draftStorage } from '../../../utils/draftStorage';
import { soundManager } from '../../../utils/audioFeedback';
import { toast } from '../../../context';
import hawiTapCardImg from '../../../assets/illustrations/Hawi Tap Card.png';
import type { RegisterStudentPayload } from '../models';

export interface AddStudentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: RegisterStudentPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export const AddStudentDrawer: React.FC<AddStudentDrawerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [course, setCourse] = useState('BS Information Technology');
  const [yearLevel, setYearLevel] = useState(1);
  const [scannedUid, setScannedUid] = useState('');
  const [restoredDraft, setRestoredDraft] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      const saved = draftStorage.get<{
        studentId: string;
        name: string;
        email: string;
        course: string;
        yearLevel: number;
        scannedUid: string;
      }>('add_student');

      if (saved && (saved.studentId || saved.name || saved.email || saved.scannedUid)) {
        setStudentId(saved.studentId || '');
        setName(saved.name || '');
        setEmail(saved.email || '');
        setCourse(saved.course || 'BS Information Technology');
        setYearLevel(saved.yearLevel || 1);
        setScannedUid(saved.scannedUid || '');
        setRestoredDraft(true);
      } else {
        setStudentId('');
        setName('');
        setEmail('');
        setCourse('BS Information Technology');
        setYearLevel(1);
        setScannedUid('');
        setRestoredDraft(false);
      }
      setTemporaryPassword('');
      setShowTemporaryPassword(false);
      const timer = setTimeout(() => scannerInputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Automatically preserve form draft across unexpected session timeouts
  useEffect(() => {
    if (isOpen && (studentId || name || email || scannedUid)) {
      draftStorage.save('add_student', {
        studentId,
        name,
        email,
        course,
        yearLevel,
        scannedUid,
      });
    }
  }, [isOpen, studentId, name, email, course, yearLevel, scannedUid]);

  const handleDiscardDraft = () => {
    draftStorage.clear('add_student');
    setStudentId('');
    setName('');
    setEmail('');
    setTemporaryPassword('');
    setCourse('BS Information Technology');
    setYearLevel(1);
    setScannedUid('');
    setRestoredDraft(false);
    toast.info('Draft discarded.');
  };

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

  const validateCommonFields = () => {
    if (!studentId.trim() || !name.trim() || !email.trim()) {
      toast.error('Please fill in Student ID, Full Name, and Email Address.');
      return false;
    }
    if (temporaryPassword.length < 12) {
      toast.error('Temporary password must be at least 12 characters.');
      return false;
    }
    return true;
  };

  const handleRegisterWithCard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateCommonFields()) return;

    if (!scannedUid.trim()) {
      toast.error('Tap card on scanner or click "Issue card later".');
      scannerInputRef.current?.focus();
      return;
    }

    await onSubmit({
      student_id: studentId.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      temporary_password: temporaryPassword,
      course,
      year_level: yearLevel,
      rfid_uid: scannedUid.trim(),
    });
    draftStorage.clear('add_student');
    setRestoredDraft(false);
  };

  const handleRegisterWithoutCard = async () => {
    if (!validateCommonFields()) return;

    await onSubmit({
      student_id: studentId.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      temporary_password: temporaryPassword,
      course,
      year_level: yearLevel,
      rfid_uid: undefined,
    });
    draftStorage.clear('add_student');
    setRestoredDraft(false);
  };

  const hasCardSelected = Boolean(scannedUid.trim());

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
        {restoredDraft && (
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-purple-200 bg-purple-50/80 px-3.5 py-2.5 text-xs text-[#7026B7]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-[#7026B7]" />
              <span className="font-bold">Restored unsaved draft</span>
            </div>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#CE2333] hover:underline"
            >
              <Trash2 className="h-3 w-3" />
              Discard
            </button>
          </div>
        )}
        {/* TOP SECTION: RFID Card Binding Station */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4 space-y-3.5">
          <div className="flex items-center gap-3">
            <img
              src={hawiTapCardImg}
              alt="Hawi Tap Card"
              className="h-12 w-12 shrink-0 object-contain drop-shadow-xs select-none"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-[#24133F]">
                Physical RFID card (optional)
              </span>
              <p className="text-[11px] text-[#756883] mt-0.5">
                Tap card on scanner or enter UID to link upon registration
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <input
              ref={scannerInputRef}
              type="text"
              placeholder="Tap card on USB desktop scanner or type UID..."
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

          <Input
            label="Temporary Password (min 12 chars)"
            type={showTemporaryPassword ? 'text' : 'password'}
            placeholder="Temporary password for first login"
            value={temporaryPassword}
            onChange={(e) => setTemporaryPassword(e.target.value)}
            minLength={12}
            autoComplete="new-password"
            rightElement={
              <button
                type="button"
                onClick={() => setShowTemporaryPassword((visible) => !visible)}
                aria-label={showTemporaryPassword ? 'Hide temporary password' : 'Show temporary password'}
                title={showTemporaryPassword ? 'Hide password' : 'Show password'}
                className="rounded-lg p-1.5 text-[#756883] hover:bg-purple-50 hover:text-[#7026B7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7026B7]"
              >
                {showTemporaryPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
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
