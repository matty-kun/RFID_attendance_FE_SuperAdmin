import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Dropdown } from '../../../components/common/Dropdown';
import { toast } from '../../../context';
import {
  Copy,
  Check,
  Unlink,
  Zap,
  Link as LinkIcon,
  X,
  Clock,
  MapPin,
  Pencil,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import hawiWavingImg from '../../../assets/illustrations/Hawi Waving.png';
import hawiQuestionImg from '../../../assets/illustrations/Hawi Question.png';
import type { StudentRecord, InventoryCard } from '../models';

export interface StudentScanItem {
  id: string;
  eventId: string;
  eventName: string;
  dayLabel: string;
  dateStr: string;
  sessionName: string;
  type: 'time_in' | 'time_out';
  status: 'on_time' | 'late' | 'missed';
  timestamp?: string;
  timeWindow: string;
  locationName: string;
  kioskName: string;
  rfidUid?: string;
}

export interface StudentProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRecord | null;
  availableCards: InventoryCard[];
  onUnlinkCard: (studentId: string, reason?: 'lost' | 'returned') => void;
  onQuickPair: (studentId: string, cardUid: string) => void;
  onOpenRapidScan: () => void;
  onUpdateStudent?: (studentId: string, payload: { name: string; course: string; year_level: number }) => Promise<any>;
  isArchived?: boolean;
  onArchiveStudent?: (studentId: string) => void;
  onRestoreStudent?: (studentId: string) => void;
}

const COURSE_OPTIONS = [
  { value: 'BS Information Technology', label: 'BS Information Technology' },
  { value: 'BS Computer Science', label: 'BS Computer Science' },
  { value: 'BS Information Systems', label: 'BS Information Systems' },
  { value: 'BS Computer Engineering', label: 'BS Computer Engineering' },
  { value: 'BS Business Administration', label: 'BS Business Administration' },
];

const YEAR_OPTIONS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
  { value: '5', label: '5th Year' },
];

// Generate deterministic event scan history based on student record
const generateStudentScans = (student: StudentRecord | null): StudentScanItem[] => {
  if (!student) return [];
  if (!student.rfid_uid) return [];

  const uid = student.rfid_uid;
  const isMaria = student.name.toLowerCase().includes('maria');
  const isCarlo = student.name.toLowerCase().includes('carlo');
  const isJson = student.name.toLowerCase().includes('json');

  return [
    {
      id: 'scan-1',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 1',
      dateStr: 'October 2, 2026',
      sessionName: 'Morning Time-In',
      type: 'time_in',
      status: 'on_time',
      timestamp: isMaria ? '07:44 AM' : isCarlo ? '07:58 AM' : '08:12 AM',
      timeWindow: '7:00 AM – 9:00 AM',
      locationName: 'Cite Gate 1',
      kioskName: 'Kiosk 1',
      rfidUid: uid,
    },
    {
      id: 'scan-2',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 1',
      dateStr: 'October 2, 2026',
      sessionName: 'Afternoon Time-Out',
      type: 'time_out',
      status: 'on_time',
      timestamp: isMaria ? '05:12 PM' : isCarlo ? '05:04 PM' : '04:58 PM',
      timeWindow: '4:00 PM – 6:00 PM',
      locationName: 'Cite Main Exit',
      kioskName: 'Kiosk 2',
      rfidUid: uid,
    },
    {
      id: 'scan-3',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 2',
      dateStr: 'October 3, 2026',
      sessionName: 'Morning Time-In',
      type: 'time_in',
      status: 'on_time',
      timestamp: isMaria ? '07:38 AM' : isCarlo ? '08:02 AM' : '07:50 AM',
      timeWindow: '7:00 AM – 9:00 AM',
      locationName: 'Cite Gate 1',
      kioskName: 'Kiosk 1',
      rfidUid: uid,
    },
    {
      id: 'scan-4',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 2',
      dateStr: 'October 3, 2026',
      sessionName: 'Afternoon Time-Out',
      type: 'time_out',
      status: isJson ? 'missed' : 'on_time',
      timestamp: isJson ? undefined : isMaria ? '05:35 PM' : '05:10 PM',
      timeWindow: '4:00 PM – 6:00 PM',
      locationName: 'Cite Main Exit',
      kioskName: 'Kiosk 2',
      rfidUid: isJson ? undefined : uid,
    },
    {
      id: 'scan-5',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 3',
      dateStr: 'October 4, 2026',
      sessionName: 'Morning Time-In',
      type: 'time_in',
      status: isCarlo ? 'late' : 'on_time',
      timestamp: isCarlo ? '09:14 AM' : isMaria ? '07:51 AM' : '08:05 AM',
      timeWindow: '7:00 AM – 9:00 AM',
      locationName: 'Gym Entrance',
      kioskName: 'Kiosk 4',
      rfidUid: uid,
    },
    {
      id: 'scan-6',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 3',
      dateStr: 'October 4, 2026',
      sessionName: 'Afternoon Time-Out',
      type: 'time_out',
      status: 'on_time',
      timestamp: isMaria ? '05:08 PM' : isCarlo ? '05:22 PM' : '05:01 PM',
      timeWindow: '4:00 PM – 6:00 PM',
      locationName: 'Gym Exit',
      kioskName: 'Kiosk 4',
      rfidUid: uid,
    },
    {
      id: 'scan-7',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 4',
      dateStr: 'October 5, 2026',
      sessionName: 'Morning Time-In',
      type: 'time_in',
      status: 'on_time',
      timestamp: isMaria ? '07:49 AM' : isCarlo ? '07:55 AM' : '08:02 AM',
      timeWindow: '7:00 AM – 9:00 AM',
      locationName: 'Cite Gate 1',
      kioskName: 'Kiosk 1',
      rfidUid: uid,
    },
    {
      id: 'scan-8',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 4',
      dateStr: 'October 5, 2026',
      sessionName: 'Afternoon Time-Out',
      type: 'time_out',
      status: 'on_time',
      timestamp: isMaria ? '04:55 PM' : isCarlo ? '05:15 PM' : '05:05 PM',
      timeWindow: '4:00 PM – 6:00 PM',
      locationName: 'Cite Main Exit',
      kioskName: 'Kiosk 2',
      rfidUid: uid,
    },
  ];
};

export const StudentProfileDrawer: React.FC<StudentProfileDrawerProps> = ({
  isOpen,
  onClose,
  student,
  availableCards,
  onUnlinkCard,
  onQuickPair,
  onOpenRapidScan,
  onUpdateStudent,
  isArchived = false,
  onArchiveStudent,
  onRestoreStudent,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'time_in' | 'time_out'>('all');
  const [copiedUid, setCopiedUid] = useState(false);
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  // Cache student reference so the drawer can animate out smoothly when closing
  const activeStudentRef = useRef<StudentRecord | null>(student);
  if (student) {
    activeStudentRef.current = student;
  }
  const currentStudent = student || activeStudentRef.current;

  // Individual click-to-edit states (Notion / Linear style)
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [isEditingYear, setIsEditingYear] = useState(false);

  // Reset states when current student changes or drawer opens
  useEffect(() => {
    if (currentStudent) {
      setNameVal(currentStudent.name);
      setIsEditingName(false);
      setIsEditingCourse(false);
      setIsEditingYear(false);
    }
  }, [currentStudent]);

  // Handle Name Autosave on blur or Enter
  const handleSaveName = async () => {
    if (!currentStudent) return;
    const trimmed = nameVal.trim();
    if (!trimmed || trimmed === currentStudent.name) {
      setNameVal(currentStudent.name);
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      if (onUpdateStudent) {
        await onUpdateStudent(currentStudent.id, {
          name: trimmed,
          course: currentStudent.course || 'BS Information Technology',
          year_level: currentStudent.year_level || 1,
        });
      }
      activeStudentRef.current = {
        ...currentStudent,
        name: trimmed,
      };
      setIsEditingName(false);
    } catch {
      setNameVal(currentStudent.name);
      setIsEditingName(false);
    } finally {
      setIsSavingName(false);
    }
  };

  // Handle Course Autosave on select
  const handleSelectCourse = async (newCourse: string) => {
    setIsEditingCourse(false);
    if (!currentStudent || newCourse === currentStudent.course) return;

    try {
      if (onUpdateStudent) {
        await onUpdateStudent(currentStudent.id, {
          name: currentStudent.name,
          course: newCourse,
          year_level: currentStudent.year_level || 1,
        });
      }
      activeStudentRef.current = {
        ...currentStudent,
        course: newCourse,
      };
    } catch {
      // toast handled in viewmodel
    }
  };

  // Handle Year Level Autosave on select
  const handleSelectYear = async (newYear: string) => {
    setIsEditingYear(false);
    if (!currentStudent) return;
    const numYear = Number(newYear);
    if (numYear === currentStudent.year_level) return;

    try {
      if (onUpdateStudent) {
        await onUpdateStudent(currentStudent.id, {
          name: currentStudent.name,
          course: currentStudent.course || 'BS Information Technology',
          year_level: numYear,
        });
      }
      activeStudentRef.current = {
        ...currentStudent,
        year_level: numYear,
      };
    } catch {
      // toast handled in viewmodel
    }
  };

  const scans = useMemo(() => generateStudentScans(currentStudent), [currentStudent]);

  const filteredScans = useMemo(() => {
    if (filterType === 'all') return scans;
    return scans.filter((s) => s.type === filterType);
  }, [scans, filterType]);

  // Group scans by event day
  const groupedScans = useMemo(() => {
    const groups: { [key: string]: { label: string; date: string; event: string; items: StudentScanItem[] } } = {};
    filteredScans.forEach((scan) => {
      const key = `${scan.eventName}-${scan.dateStr}`;
      if (!groups[key]) {
        groups[key] = {
          label: scan.dayLabel,
          date: scan.dateStr,
          event: scan.eventName,
          items: [],
        };
      }
      groups[key].items.push(scan);
    });
    return Object.values(groups);
  }, [filteredScans]);

  const handleCopyUid = () => {
    if (!currentStudent?.rfid_uid) return;
    navigator.clipboard.writeText(currentStudent.rfid_uid);
    setCopiedUid(true);
    toast.success('Card UID copied to clipboard');
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const yearLabel = (year?: number | null) =>
    year ? `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year` : '—';

  if (!currentStudent) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => {
        setIsEditingName(false);
        setIsEditingCourse(false);
        setIsEditingYear(false);
        onClose();
      }}
      maxWidth="2xl"
      hideHeader
      noPadding
    >
      <div className="flex flex-col min-h-full bg-white select-none">
        {/* Duolingo-style Top Hero Banner with Smooth Fog Transition */}
        <div className="relative bg-[#78C9FC] px-6 pt-5 pb-0 flex flex-col justify-between min-h-[230px] overflow-hidden">
          {/* Top Bar inside banner */}
          <div className="flex items-center justify-between z-20 gap-3">
            {/* Click-to-Edit Student Name (Notion style) */}
            {!isEditingName ? (
              <div
                role="button"
                tabIndex={isArchived ? -1 : 0}
                onClick={() => {
                  if (!isArchived) {
                    setNameVal(currentStudent.name);
                    setIsEditingName(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (!isArchived && (e.key === 'Enter' || e.key === ' ')) {
                    setNameVal(currentStudent.name);
                    setIsEditingName(true);
                  }
                }}
                className={`group flex items-center gap-2 rounded-xl px-2 py-1 -ml-2 transition-all max-w-[420px] ${
                  isArchived ? 'cursor-default' : 'hover:bg-white/40 cursor-pointer'
                }`}
                title={isArchived ? undefined : 'Click to edit student name'}
              >
                <h2 className="text-2xl font-black text-[#15344F] tracking-tight truncate">
                  {currentStudent.name}
                </h2>
                {!isArchived && (
                  <Pencil className="h-4 w-4 text-[#15344F]/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
                {isArchived && (
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    Archived
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 max-w-[420px] flex-1">
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  onBlur={() => void handleSaveName()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveName();
                    if (e.key === 'Escape') {
                      setNameVal(currentStudent.name);
                      setIsEditingName(false);
                    }
                  }}
                  disabled={isSavingName}
                  autoFocus
                  placeholder="Student Full Name"
                  className="w-full text-xl font-black text-[#15344F] bg-white border border-[#D8B4ED] rounded-xl px-3 py-1 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#7026B7]"
                />
                {isSavingName && (
                  <span className="text-xs font-bold text-[#15344F] shrink-0 animate-pulse">
                    Saving…
                  </span>
                )}
              </div>
            )}

            {/* Right: Close button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsEditingName(false);
                  setIsEditingCourse(false);
                  setIsEditingYear(false);
                  onClose();
                }}
                aria-label="Close drawer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 hover:bg-white text-[#15344F] shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <X className="h-5 w-5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Character standing in center of banner */}
          <div className="flex justify-center items-end mt-2 z-0 relative">
            <img
              src={hawiWavingImg}
              alt="Student Character"
              className="h-36 w-auto object-contain drop-shadow-md pointer-events-none"
            />
          </div>

          {/* Smooth Fog Transition Layer: Seamless white mist dissolving banner into content below */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-white via-white/70 to-transparent z-10"
          />
        </div>

        {/* Content Area Below Banner */}
        <div className="flex-1 p-5 pt-3 pb-8 space-y-4 relative z-20 bg-white">
          {/* Subheading Handle */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-[#756883] uppercase tracking-wider">
              @{currentStudent.student_id} · ENROLLED {currentStudent.created_at ? new Date(currentStudent.created_at).getFullYear() : '2023'}
            </p>
            {isArchived && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                Archived Record
              </span>
            )}
          </div>

          {/* Archived Banner / Quick Restore Bar */}
          {isArchived ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-amber-900">Student is Archived</p>
                <p className="text-[11px] text-amber-700/90 mt-0.5">
                  Historical attendance logs remain intact. Restore student to re-pair cards or register for future events.
                </p>
              </div>
              <Button
                variant="success"
                size="sm"
                onClick={() => {
                  onRestoreStudent?.(currentStudent.id);
                }}
                leftIcon={<ArchiveRestore className="h-4 w-4" />}
                className="shrink-0"
              >
                Restore
              </Button>
            </div>
          ) : (
            /* 3D Tactile Card Action Button */
            currentStudent.rfid_uid ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleCopyUid}
                  className="flex-1 font-mono text-xs justify-center"
                  leftIcon={copiedUid ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-[#756883]" />}
                >
                  Card UID: {currentStudent.rfid_uid}
                </Button>

                <Button
                  variant="danger"
                  size="md"
                  onClick={() => setIsUnlinkModalOpen(true)}
                  leftIcon={<Unlink className="h-4 w-4" />}
                  title="Unlink RFID Card"
                >
                  Unlink
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {availableCards.length > 0 && (
                  <Button
                    variant="success"
                    size="md"
                    onClick={() => onQuickPair(currentStudent.id, availableCards[0].uid)}
                    className="flex-1 justify-center"
                    leftIcon={<LinkIcon className="h-4 w-4" />}
                  >
                    Pair Card #{availableCards[0].cardNumber}
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    onClose();
                    onOpenRapidScan();
                  }}
                  leftIcon={<Zap className="h-4 w-4 fill-current" />}
                >
                  Scan card
                </Button>
              </div>
            )
          )}

          {/* OVERVIEW SECTION (Click-to-Edit Course & Year Level) */}
          <div className="pt-1">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black tracking-wider text-[#A59AAB] uppercase">
                Overview
              </p>
              {!isArchived && (
                <span className="text-[10px] text-[#A59AAB]">
                  Click any field to edit
                </span>
              )}
            </div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Program / Course Card */}
              {!isEditingCourse ? (
                <div
                  role="button"
                  tabIndex={isArchived ? -1 : 0}
                  onClick={() => !isArchived && setIsEditingCourse(true)}
                  onKeyDown={(e) => {
                    if (!isArchived && (e.key === 'Enter' || e.key === ' ')) {
                      setIsEditingCourse(true);
                    }
                  }}
                  className={`group rounded-2xl border bg-white p-3 shadow-2xs transition-all text-left ${
                    isArchived
                      ? 'border-[#E5E0EB] cursor-default'
                      : 'border-[#E5E0EB] hover:border-[#7026B7] hover:shadow-xs cursor-pointer'
                  }`}
                  title={isArchived ? undefined : 'Click to change course'}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-[#756883] uppercase">Program / Course</p>
                    {!isArchived && (
                      <span className="text-[10px] font-bold text-[#7026B7] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        <Pencil className="h-3 w-3" /> Edit
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-[#24133F] mt-0.5">{currentStudent.course || '—'}</p>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-[#7026B7] bg-white p-2.5 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-extrabold text-[#7026B7] uppercase">
                      Select Program / Course
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEditingCourse(false)}
                      className="text-[10px] font-bold text-[#756883] hover:text-[#24133F] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <Dropdown
                    value={currentStudent.course || 'BS Information Technology'}
                    onChange={(val) => void handleSelectCourse(val)}
                    buttonClassName="h-9 w-full rounded-xl border-[#D8B4ED] text-xs bg-white"
                    options={COURSE_OPTIONS}
                  />
                </div>
              )}

              {/* Year Level Card */}
              {!isEditingYear ? (
                <div
                  role="button"
                  tabIndex={isArchived ? -1 : 0}
                  onClick={() => !isArchived && setIsEditingYear(true)}
                  onKeyDown={(e) => {
                    if (!isArchived && (e.key === 'Enter' || e.key === ' ')) {
                      setIsEditingYear(true);
                    }
                  }}
                  className={`group rounded-2xl border bg-white p-3 shadow-2xs transition-all text-left ${
                    isArchived
                      ? 'border-[#E5E0EB] cursor-default'
                      : 'border-[#E5E0EB] hover:border-[#7026B7] hover:shadow-xs cursor-pointer'
                  }`}
                  title={isArchived ? undefined : 'Click to change year level'}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-[#756883] uppercase">Year Level</p>
                    {!isArchived && (
                      <span className="text-[10px] font-bold text-[#7026B7] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        <Pencil className="h-3 w-3" /> Edit
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-[#24133F] mt-0.5">{yearLabel(currentStudent.year_level)}</p>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-[#7026B7] bg-white p-2.5 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-extrabold text-[#7026B7] uppercase">
                      Select Year Level
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEditingYear(false)}
                      className="text-[10px] font-bold text-[#756883] hover:text-[#24133F] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <Dropdown
                    value={String(currentStudent.year_level || 1)}
                    onChange={(val) => void handleSelectYear(val)}
                    buttonClassName="h-9 w-full rounded-xl border-[#D8B4ED] text-xs bg-white"
                    options={YEAR_OPTIONS}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SCAN HISTORY SECTION */}
          <div className="pt-2 space-y-2.5 relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-[11px] font-black tracking-wider text-[#A59AAB] uppercase">
                Scan History
              </p>

              {/* Segmented Filter Pills */}
              {scans.length > 0 && (
                <div className="inline-flex rounded-xl bg-[#FAF8FC] border border-[#E5E0EB] p-1 text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      filterType === 'all'
                        ? 'bg-white text-[#7026B7] shadow-xs'
                        : 'text-[#756883] hover:text-[#24133F]'
                    }`}
                  >
                    All ({scans.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('time_in')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      filterType === 'time_in'
                        ? 'bg-white text-[#7026B7] shadow-xs'
                        : 'text-[#756883] hover:text-[#24133F]'
                    }`}
                  >
                    Time-In
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('time_out')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      filterType === 'time_out'
                        ? 'bg-white text-[#7026B7] shadow-xs'
                        : 'text-[#756883] hover:text-[#24133F]'
                    }`}
                  >
                    Time-Out
                  </button>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div>
              {groupedScans.length > 0 ? (
                <div className="rounded-2xl border border-[#E5E0EB] bg-white overflow-hidden shadow-xs divide-y divide-[#E5E0EB]">
                  {groupedScans.map((group) => (
                    <div key={`${group.event}-${group.date}`}>
                      {/* Subtle Date Header */}
                      <div className="flex items-center justify-between bg-[#FAF8FC] px-4 py-2 text-xs border-b border-[#F0E8FC]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#24133F]">{group.event}</span>
                          <span className="text-[#A59AAB]">·</span>
                          <span className="font-medium text-[#7026B7]">{group.label}</span>
                        </div>
                        <span className="text-[11px] text-[#756883]">{group.date}</span>
                      </div>

                      {/* Scans in this Day */}
                      <div className="divide-y divide-[#F0E8FC]">
                        {group.items.map((scan) => (
                          <div
                            key={scan.id}
                            className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#FAF8FC]/50 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[#24133F]">
                                  {scan.sessionName}
                                </span>
                                {scan.status === 'late' && (
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700">
                                    <i className="h-1 w-1 rounded-full bg-amber-500" />
                                    Late
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-[#756883] mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-[#A59CAC] shrink-0" />
                                  <span>{scan.timeWindow}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-[#A59CAC] shrink-0" />
                                  <span>{scan.locationName}</span>
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {scan.timestamp ? (
                                <p className="font-mono text-xs font-bold text-[#24133F] tabular-nums">
                                  {scan.timestamp}
                                </p>
                              ) : (
                                <span className="text-xs text-[#A59AAB] italic">
                                  No scan
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E5E0EB] bg-white py-12 px-4 text-center">
                  <img
                    src={hawiQuestionImg}
                    alt="No scan records"
                    className="w-20 h-20 object-contain mb-2"
                  />
                  <p className="text-xs font-bold text-[#24133F]">No scan logs found</p>
                  <p className="text-[11px] text-[#756883] max-w-xs mt-0.5">
                    {currentStudent.rfid_uid
                      ? 'This student has not checked into any event sessions yet.'
                      : 'Link an RFID card first to track automatic event attendance.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ARCHIVE ACTION BAR (At bottom of drawer) */}
          <div className="pt-4 border-t border-[#E5E0EB]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#24133F]">Student Record Status</p>
                <p className="text-[11px] text-[#756883] mt-0.5">
                  {isArchived
                    ? 'Student is archived. Restore anytime to re-enable card pairing and active rosters.'
                    : 'Archive student to remove from active lists. Historical attendance records are permanently kept.'}
                </p>
              </div>

              {isArchived ? (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onRestoreStudent?.(currentStudent.id)}
                  leftIcon={<ArchiveRestore className="h-3.5 w-3.5" />}
                  className="shrink-0 self-start sm:self-auto"
                >
                  Restore Student
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsArchiveConfirmOpen(true)}
                  leftIcon={<Archive className="h-3.5 w-3.5 text-[#756883]" />}
                  className="shrink-0 self-start sm:self-auto text-xs text-[#756883] hover:text-rose-600 hover:border-rose-300"
                >
                  Archive Student
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unlink Reason Confirmation Modal */}
      <Modal
        isOpen={isUnlinkModalOpen}
        onClose={() => setIsUnlinkModalOpen(false)}
        title="Unlink RFID Card"
        description={`Unlinking Card ${currentStudent.rfid_uid} from ${currentStudent.name}. All past attendance records remain permanently preserved.`}
        maxWidth="sm"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs font-semibold text-[#756883]">
            Select the reason for unlinking this card:
          </p>

          <button
            type="button"
            onClick={() => {
              setIsUnlinkModalOpen(false);
              onUnlinkCard(currentStudent.id, 'lost');
            }}
            className="w-full text-left p-3.5 rounded-2xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-rose-700">Card Reported Lost</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">Revoke</span>
            </div>
            <p className="text-[11px] text-rose-600/90 mt-1 leading-relaxed">
              Card is lost or stolen. Permanently deactivates UID from active pool so it cannot be scanned or re-issued. Student is freed to receive a replacement card.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsUnlinkModalOpen(false);
              onUnlinkCard(currentStudent.id, 'returned');
            }}
            className="w-full text-left p-3.5 rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] hover:bg-[#F2ECF9] transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#24133F]">Card Returned / Swapped</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7026B7] bg-[#EBE2F9] px-2 py-0.5 rounded-full border border-[#D8B4ED]">Return to Pool</span>
            </div>
            <p className="text-[11px] text-[#756883] mt-1 leading-relaxed">
              Card is physically intact. Detaches UID from student and places it back in the Unassigned Card Pool for other students.
            </p>
          </button>

          <div className="pt-2 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsUnlinkModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Archive Student Confirmation Modal */}
      <Modal
        isOpen={isArchiveConfirmOpen}
        onClose={() => setIsArchiveConfirmOpen(false)}
        title="Archive Student"
        description={`Are you sure you want to archive ${currentStudent.name} (${currentStudent.student_id})?`}
        maxWidth="sm"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-[#756883] leading-relaxed">
            Archiving moves this student to the Archived roster. Any linked card will be returned to the inventory pool.
            All historical event attendance records remain permanently preserved.
          </p>
          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsArchiveConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setIsArchiveConfirmOpen(false);
                onArchiveStudent?.(currentStudent.id);
                onClose();
              }}
              leftIcon={<Archive className="h-3.5 w-3.5" />}
            >
              Archive Student
            </Button>
          </div>
        </div>
      </Modal>
    </Drawer>
  );
};
