import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Button } from '../../../components/common/Button';
import { Dropdown } from '../../../components/common/Dropdown';
import { Modal } from '../../../components/common/Modal';
import { ImageCropModal } from '../../../components/common/ImageCropModal';
import { toast } from '../../../context';
import {
  Copy,
  Check,
  ChevronDown,
  Unlink,
  X,
  Clock,
  Calendar,
  MapPin,
  Pencil,
  Archive,
  ArchiveRestore,
  CreditCard,
  Radio,
  Loader2,
  Camera,
  Zap,
  Trash2,
} from 'lucide-react';
import { DeleteStudentConfirmationModal } from './DeleteStudentConfirmationModal';
import hawiWavingImg from '../../../assets/illustrations/Hawi Waving.png';
import hawiQuestionImg from '../../../assets/illustrations/Hawi Question.png';
import hawiBoxImg from '../../../assets/illustrations/Hawi Box.png';
import type { StudentRecord } from '../models';
import { formatYearLevel } from '../../../utils/formatters';
import { request } from '../../../services/apiClient';

export interface StudentScanItem {
  id: string;
  eventId: string;
  eventName: string;
  dayLabel: string;
  dateStr: string;
  sessionName: string;
  type: 'time_in' | 'time_out';
  timestamp?: string;
  timeWindow: string;
  locationName: string;
  cardNumber: string | null;
}

export interface StudentProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRecord | null;
  onUnlinkCard: (studentId: string, reason?: 'lost' | 'returned') => void;
  onQuickPair: (studentId: string, cardUid: string) => Promise<{ success: boolean; message: string }> | any;
  onOpenRapidScan: () => void;
  onUpdateStudent?: (studentId: string, payload: { name: string; course: string; year_level: number }) => Promise<any>;
  isArchived?: boolean;
  onArchiveStudent?: (studentId: string) => Promise<boolean>;
  onRestoreStudent?: (studentId: string) => void;
  onUploadAvatar?: (studentId: string, imageBase64: string) => Promise<string>;
  onRemoveAvatar?: (studentId: string) => Promise<void>;
  onDeleteStudent?: (studentId: string) => Promise<boolean>;
}

const COURSE_OPTIONS = [
  'BS Information Technology',
  'BS Computer Science',
  'BS Information Systems',
  'BS Computer Engineering',
  'BS Business Administration',
];

const YEAR_OPTIONS = [
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
  { value: 5, label: '5th Year' },
];

type RecordedScan = {
  id: string;
  type: 'time_in' | 'time_out';
  recorded_at: string;
  card_number: string | null;
  location_name: string;
  session: {
    id: string;
    name: string;
    date: string;
    event_id: string;
    event_name: string;
    event_start_date: string | null;
    time_in_start: string;
    time_in_end: string;
    time_out_start: string;
    time_out_end: string;
  } | null;
};

const formatScanTime = (value: string) => new Date(value).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });
const formatWindowTime = (value: string) => new Date(`2000-01-01T${value}+08:00`).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
const toStudentScan = (record: RecordedScan): StudentScanItem => {
  const session = record.session;
  const scanDate = session?.date ?? new Date(record.recorded_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const dayNumber = session?.event_start_date ? Math.round((Date.parse(`${scanDate}T00:00:00Z`) - Date.parse(`${session.event_start_date}T00:00:00Z`)) / 86400000) + 1 : null;
  const windowStart = record.type === 'time_in' ? session?.time_in_start : session?.time_out_start;
  const windowEnd = record.type === 'time_in' ? session?.time_in_end : session?.time_out_end;
  return {
    id: record.id,
    eventId: session?.event_id ?? 'unknown',
    eventName: session?.event_name ?? 'Event',
    dayLabel: dayNumber && dayNumber > 0 ? `Day ${dayNumber}` : 'Event day',
    dateStr: new Date(`${scanDate}T00:00:00+08:00`).toLocaleDateString('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' }),
    sessionName: session?.name ?? (record.type === 'time_in' ? 'Time In' : 'Time Out'),
    type: record.type,
    timestamp: formatScanTime(record.recorded_at),
    timeWindow: windowStart && windowEnd ? `${formatWindowTime(windowStart)} – ${formatWindowTime(windowEnd)}` : '',
    locationName: record.location_name,
    cardNumber: record.card_number,
  };
};

export const StudentProfileDrawer: React.FC<StudentProfileDrawerProps> = ({
  isOpen,
  onClose,
  student,
  onUnlinkCard,
  onQuickPair,
  onOpenRapidScan,
  onUpdateStudent,
  isArchived = false,
  onArchiveStudent,
  onRestoreStudent,
  onUploadAvatar,
  onRemoveAvatar,
  onDeleteStudent,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'time_in' | 'time_out'>('all');
  const [copiedUid, setCopiedUid] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Photo Upload & Centering/Crop State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentStudent) return;

    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
    if (!isImage) {
      toast.error('Invalid file format. Please upload an image file (PNG, JPG, or WEBP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (!base64) return;

      const testImg = new Image();
      testImg.onload = () => {
        setRawImageForCrop(base64);
        setIsCropModalOpen(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      testImg.onerror = () => {
        toast.error('The selected file is not a valid image.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      testImg.src = base64;
    };
    reader.onerror = () => {
      toast.error('Failed to read the selected file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmCrop = async (croppedBase64: string) => {
    if (!onUploadAvatar || !currentStudent) return;
    setIsUploadingPhoto(true);
    try {
      const newUrl = await onUploadAvatar(currentStudent.id, croppedBase64);
      activeStudentRef.current = {
        ...currentStudent,
        avatar_url: newUrl,
      };
      setIsCropModalOpen(false);
      setRawImageForCrop(null);
    } catch {
      // error toast handled by viewmodel
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!onRemoveAvatar || !currentStudent || isUploadingPhoto) return;
    setIsUploadingPhoto(true);
    try {
      await onRemoveAvatar(currentStudent.id);
      activeStudentRef.current = { ...currentStudent, avatar_url: null };
    } catch { /* The viewmodel shows the error toast. */ }
    finally { setIsUploadingPhoto(false); }
  };

  // Inline RFID Card Scanning & Pairing with Auto-Enter
  const [isScanningCard, setIsScanningCard] = useState(false);
  const [inlineCardUid, setInlineCardUid] = useState('');
  const [isPairingCard, setIsPairingCard] = useState(false);
  const cardInputRef = useRef<HTMLInputElement>(null);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const submitCardUid = async (uidToSubmit: string) => {
    const cleanUid = uidToSubmit.trim().toUpperCase();
    if (!cleanUid || !currentStudent || isPairingCard) return;

    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }

    setIsPairingCard(true);
    try {
      const res = await onQuickPair(currentStudent.id, cleanUid);
      if (res?.success) {
        activeStudentRef.current = {
          ...currentStudent,
          rfid_uid: cleanUid,
        };
        setIsScanningCard(false);
        setInlineCardUid('');
      } else {
        // Clear input so user can instantly tap next card without manual deletion
        setInlineCardUid('');
        setTimeout(() => cardInputRef.current?.focus(), 50);
      }
    } catch {
      setInlineCardUid('');
      setTimeout(() => cardInputRef.current?.focus(), 50);
    } finally {
      setIsPairingCard(false);
    }
  };

  const handleInlineCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCardUid(inlineCardUid);
  };

  const handleCardInputChange = (val: string) => {
    setInlineCardUid(val);
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
    }
    const clean = val.trim();
    // Auto-enter: automatically submit when reader finishes burst input (250ms debounce)
    if (clean.length >= 4) {
      autoSubmitTimeoutRef.current = setTimeout(() => {
        void submitCardUid(clean);
      }, 250);
    }
  };

  // Cache student reference so the drawer can animate out smoothly when closing
  const activeStudentRef = useRef<StudentRecord | null>(student);
  if (student) {
    activeStudentRef.current = student;
  }
  const currentStudent = student || activeStudentRef.current;

  // Seamless Inline Name Editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Floating Dropdowns for Course & Year
  const [isCourseMenuOpen, setIsCourseMenuOpen] = useState(false);
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);

  const courseDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Close floating menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(e.target as Node)) {
        setIsCourseMenuOpen(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setIsYearMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state when student changes
  useEffect(() => {
    if (currentStudent) {
      setNameVal(currentStudent.name);
      setIsEditingName(false);
      setIsCourseMenuOpen(false);
      setIsYearMenuOpen(false);
      setIsScanningCard(false);
      setInlineCardUid('');
      setIsUnlinking(false);
      setSelectedEventId('all');
      setFilterType('all');
    }
  }, [currentStudent?.id]);

  // Handle Name Autosave
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

  // Handle Course Update
  const handleSelectCourse = async (courseName: string) => {
    setIsCourseMenuOpen(false);
    if (!currentStudent || courseName === currentStudent.course) return;

    try {
      if (onUpdateStudent) {
        await onUpdateStudent(currentStudent.id, {
          name: currentStudent.name,
          course: courseName,
          year_level: currentStudent.year_level || 1,
        });
      }
      activeStudentRef.current = {
        ...currentStudent,
        course: courseName,
      };
    } catch {
      // toast shown by viewmodel
    }
  };

  // Handle Year Level Update
  const handleSelectYear = async (yearNum: number) => {
    setIsYearMenuOpen(false);
    if (!currentStudent || yearNum === currentStudent.year_level) return;

    try {
      if (onUpdateStudent) {
        await onUpdateStudent(currentStudent.id, {
          name: currentStudent.name,
          course: currentStudent.course || 'BS Information Technology',
          year_level: yearNum,
        });
      }
      activeStudentRef.current = {
        ...currentStudent,
        year_level: yearNum,
      };
    } catch {
      // toast shown by viewmodel
    }
  };

  const [scans, setScans] = useState<StudentScanItem[]>([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const [scanError, setScanError] = useState(false);
  useEffect(() => {
    if (!isOpen || !currentStudent?.id) return;
    let cancelled = false;
    setScans([]);
    setLoadingScans(true);
    setScanError(false);
    void request.get<{ scans: RecordedScan[] }>(`/students/${currentStudent.id}/scans`)
      .then(result => { if (!cancelled) setScans(result.scans.map(toStudentScan)); })
      .catch(() => { if (!cancelled) { setScanError(true); toast.error('Could not load student scan history.'); } })
      .finally(() => { if (!cancelled) setLoadingScans(false); });
    return () => { cancelled = true; };
  }, [isOpen, currentStudent?.id]);

  // Dynamic list of unique events from scans
  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    scans.forEach((s) => {
      if (!map.has(s.eventId)) {
        map.set(s.eventId, s.eventName);
      }
    });
    return [
      { value: 'all', label: `All Events (${map.size})` },
      ...Array.from(map.entries()).map(([id, name]) => ({
        value: id,
        label: name,
      })),
    ];
  }, [scans]);

  // Filter by selected event
  const eventFilteredScans = useMemo(() => {
    if (selectedEventId === 'all') return scans;
    return scans.filter((s) => s.eventId === selectedEventId);
  }, [scans, selectedEventId]);

  // Filter by scan type (all / time_in / time_out)
  const filteredScans = useMemo(() => {
    if (filterType === 'all') return eventFilteredScans;
    return eventFilteredScans.filter((s) => s.type === filterType);
  }, [eventFilteredScans, filterType]);

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

  const yearLabel = formatYearLevel;

  if (!currentStudent) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => {
        setIsEditingName(false);
        setIsCourseMenuOpen(false);
        setIsYearMenuOpen(false);
        onClose();
      }}
      maxWidth="2xl"
      hideHeader
      noPadding
    >
      <div className="flex flex-col min-h-full bg-white select-none">
        {/* Luminous Brand Violet Hero Header with Extended Downward Dissolve */}
        <div className="relative bg-gradient-to-b from-[#9333EA] via-[#A855F7] via-[#C084FC]/80 via-[#F3E8FF] to-white px-6 pt-5 pb-10 flex flex-col justify-between">
          {/* Top Bar inside banner */}
          <div className="flex items-center justify-between z-20 gap-3">
            {/* Seamless In-Place Name Editor */}
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
                className={`group flex items-center gap-2 rounded-xl py-0.5 px-1 -ml-1 transition-all ${
                  isArchived ? 'cursor-default' : 'hover:bg-white/20 cursor-pointer'
                }`}
                title={isArchived ? undefined : 'Click to rename student'}
              >
                <h2 className="text-2xl font-black text-white tracking-tight truncate max-w-[340px] drop-shadow-sm">
                  {currentStudent.name}
                </h2>
                {!isArchived && (
                  <Pencil className="h-4 w-4 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
                {isArchived && (
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/90 text-amber-950 border border-amber-300 shadow-xs">
                    Archived
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 max-w-[340px]">
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
                  className="text-2xl font-black text-white tracking-tight bg-transparent border-b-2 border-white outline-none px-0 py-0 w-full placeholder:text-white/60"
                />
                {isSavingName && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    Saving…
                  </span>
                )}
              </div>
            )}

            {/* Top Right Actions: Archive + Close */}
            <div className="flex items-center gap-2 shrink-0">
              {!isArchived ? (
                <button
                  type="button"
                  onClick={() => setIsArchiveConfirmOpen(true)}
                  title="Archive Student"
                  aria-label="Archive Student"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white hover:text-rose-200 border border-white/25 backdrop-blur-md shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Archive className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onRestoreStudent?.(currentStudent.id)}
                  title="Restore Student to Active Roster"
                  aria-label="Restore Student to Active Roster"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-emerald-200 border border-white/25 backdrop-blur-md shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <ArchiveRestore className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                title="Delete Student Permanently"
                aria-label="Delete Student Permanently"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 hover:bg-rose-600 text-white border border-white/25 backdrop-blur-md shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditingName(false);
                  setIsCourseMenuOpen(false);
                  setIsYearMenuOpen(false);
                  onClose();
                }}
                aria-label="Close drawer"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/25 backdrop-blur-md shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <X className="h-5 w-5 stroke-[2.5] text-white" />
              </button>
            </div>
          </div>

          {/* Character or Student Photo in center of banner */}
          <div className="flex flex-col items-center justify-center mt-3 mb-2 z-20 relative">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {currentStudent.avatar_url ? (
              <div className="flex flex-col items-center">
                <div className="relative group/avatar">
                <img
                  src={currentStudent.avatar_url}
                  alt={currentStudent.name}
                  className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-[0_12px_28px_rgba(147,51,234,0.3)] select-none"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto || isArchived}
                  title="Change profile picture"
                  className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#7C27BD] hover:bg-purple-50 shadow-md border border-purple-200/80 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#7C27BD]" />
                  ) : (
                    <Camera className="h-4 w-4 text-[#7C27BD]" />
                  )}
                </button>
                </div>
                <button type="button" onClick={() => void handleRemovePhoto()} disabled={isUploadingPhoto || isArchived} className="mt-3 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-sm transition-colors hover:bg-rose-50 disabled:opacity-50">Remove photo</button>
              </div>
            ) : (
              <div className="relative flex flex-col items-center">
                <img
                  src={hawiWavingImg}
                  alt="Student Character"
                  className="h-32 w-auto object-contain drop-shadow-md pointer-events-none select-none"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto || isArchived}
                  title="Upload profile picture"
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-purple-50 text-xs font-bold text-[#7C27BD] shadow-md border border-purple-200/80 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7C27BD]" />
                  ) : (
                    <Camera className="h-3.5 w-3.5 text-[#7C27BD]" />
                  )}
                  <span>{isUploadingPhoto ? 'Uploading…' : 'Upload Photo'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Area Below Banner */}
        <div className="flex-1 p-5 pt-1 pb-8 space-y-4 relative z-20 bg-white">
          {/* Subheading Handle */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-[#756883] tracking-wider">
              @{currentStudent.student_id}
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
                  Historical attendance logs remain intact. Click Restore in the top bar to re-pair cards or add to active events.
                </p>
              </div>
            </div>
          ) : currentStudent.rfid_uid ? (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={handleCopyUid}
                className="flex-1 font-mono text-xs justify-center"
                leftIcon={copiedUid ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-400" />}
                title="Click to copy Card UID"
              >
                Card UID: {currentStudent.rfid_uid}
              </Button>

              <Button
                variant="danger"
                size="md"
                onClick={() => setIsUnlinking(true)}
                leftIcon={<Unlink className="h-4 w-4" />}
                title="Return RFID Card"
              >
                Return card
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 text-slate-500">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">No RFID Card Assigned</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Link a card to track automated event attendance
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isScanningCard ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setIsScanningCard(true);
                        setTimeout(() => cardInputRef.current?.focus(), 80);
                      }}
                      leftIcon={<Radio className="h-3.5 w-3.5" />}
                    >
                      Scan / Link Card
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Inline RFID Card Scanner / Manual Input */}
              {isScanningCard && (
                <form
                  onSubmit={handleInlineCardSubmit}
                  className="mt-3 pt-3 border-t border-slate-200/80 flex flex-col gap-2 animate-in fade-in duration-150"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        ref={cardInputRef}
                        type="text"
                        value={inlineCardUid}
                        onChange={(e) => handleCardInputChange(e.target.value)}
                        placeholder="Tap RFID card on reader or enter UID..."
                        className="w-full rounded-xl border border-brand-300 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-brand-500"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={!inlineCardUid.trim() || isPairingCard}
                        isLoading={isPairingCard}
                      >
                        Link Card
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (autoSubmitTimeoutRef.current) {
                            clearTimeout(autoSubmitTimeoutRef.current);
                          }
                          setIsScanningCard(false);
                          setInlineCardUid('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                    <span>Auto-pairs on card tap</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (autoSubmitTimeoutRef.current) {
                          clearTimeout(autoSubmitTimeoutRef.current);
                        }
                        onClose();
                        onOpenRapidScan();
                      }}
                      className="inline-flex items-center gap-1.5 text-brand-700 hover:text-brand-800 font-bold hover:underline cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />
                      <span>Open Rapid Scanner &rarr;</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* OVERVIEW SECTION: Single-layer Clean Cards with Floating Dropdown */}
          <div className="pt-1">
            <p className="text-[11px] font-black tracking-wider text-[#A59AAB] uppercase">
              Overview
            </p>

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {/* Program / Course Card */}
              <div ref={courseDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!isArchived) {
                      setIsCourseMenuOpen(!isCourseMenuOpen);
                      setIsYearMenuOpen(false);
                    }
                  }}
                  className={`w-full text-left rounded-2xl border bg-white p-3 shadow-2xs transition-all group flex items-start justify-between ${
                    isArchived
                      ? 'border-slate-200 cursor-default'
                      : isCourseMenuOpen
                      ? 'border-brand-700 ring-2 ring-brand-100 cursor-pointer'
                      : 'border-slate-200 hover:border-brand-700 hover:shadow-xs cursor-pointer'
                  }`}
                  title={isArchived ? undefined : 'Click to change course'}
                >
                  <div className="min-w-0 pr-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Program / Course</p>
                    <p className="font-bold text-slate-900 mt-0.5 truncate">{currentStudent.course || '—'}</p>
                  </div>
                  {!isArchived && (
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform shrink-0 mt-0.5 group-hover:text-brand-700 ${
                        isCourseMenuOpen ? 'rotate-180 text-brand-700' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Floating Course Menu (No layout shifts) */}
                {isCourseMenuOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase px-2.5 py-1">
                      Select Course
                    </p>
                    {COURSE_OPTIONS.map((c) => {
                      const isSelected = c === currentStudent.course;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => void handleSelectCourse(c)}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-brand-50 text-brand-700 font-bold'
                              : 'text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{c}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-brand-700 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Year Level Card */}
              <div ref={yearDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!isArchived) {
                      setIsYearMenuOpen(!isYearMenuOpen);
                      setIsCourseMenuOpen(false);
                    }
                  }}
                  className={`w-full text-left rounded-2xl border bg-white p-3 shadow-2xs transition-all group flex items-start justify-between ${
                    isArchived
                      ? 'border-slate-200 cursor-default'
                      : isYearMenuOpen
                      ? 'border-brand-700 ring-2 ring-brand-100 cursor-pointer'
                      : 'border-slate-200 hover:border-brand-700 hover:shadow-xs cursor-pointer'
                  }`}
                  title={isArchived ? undefined : 'Click to change year level'}
                >
                  <div className="min-w-0 pr-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Year Level</p>
                    <p className="font-bold text-slate-900 mt-0.5">{yearLabel(currentStudent.year_level)}</p>
                  </div>
                  {!isArchived && (
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform shrink-0 mt-0.5 group-hover:text-brand-700 ${
                        isYearMenuOpen ? 'rotate-180 text-brand-700' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Floating Year Menu (No layout shifts) */}
                {isYearMenuOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase px-2.5 py-1">
                      Select Year Level
                    </p>
                    {YEAR_OPTIONS.map((y) => {
                      const isSelected = y.value === currentStudent.year_level;
                      return (
                        <button
                          key={y.value}
                          type="button"
                          onClick={() => void handleSelectYear(y.value)}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-brand-50 text-brand-700 font-bold'
                              : 'text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <span>{y.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-brand-700 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SCAN HISTORY SECTION */}
          <div className="pt-2 space-y-2.5 relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="text-[11px] font-black tracking-wider text-[#A59AAB] uppercase shrink-0">
                  Scan History
                </p>
                {scans.length > 0 && (
                  <Dropdown
                    value={selectedEventId}
                    onChange={setSelectedEventId}
                    options={eventOptions}
                    icon={<Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    className="w-48 sm:w-52"
                    buttonClassName="h-7 py-0.5 px-2.5 text-xs rounded-xl bg-white border border-[#E5E0EB] hover:border-brand-500 font-bold text-slate-700 shadow-2xs"
                    menuClassName="w-60 z-50 rounded-xl shadow-xl border border-slate-200 py-1"
                  />
                )}
              </div>

              {/* Segmented Filter Pills */}
              {scans.length > 0 && (
                <div className="inline-flex rounded-xl bg-[#FAF8FC] border border-[#E5E0EB] p-1 text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      filterType === 'all'
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    All ({eventFilteredScans.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('time_in')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      filterType === 'time_in'
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Time-In
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('time_out')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      filterType === 'time_out'
                        ? 'bg-white text-brand-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
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
                      {/* Date Header */}
                      <div className="flex items-center justify-between bg-[#FAF8FC] px-4 py-2 text-xs border-b border-[#F0E8FC]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{group.event}</span>
                          <span className="text-slate-400">·</span>
                          <span className="font-medium text-brand-700">{group.label}</span>
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
                              <p className="mt-1 text-[11px] text-[#756883]">Card used: <span className="font-semibold text-[#24133F]">{scan.cardNumber ?? 'Card not recorded'}</span></p>
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
              ) : loadingScans ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#E5E0EB] bg-white py-10 text-xs font-bold text-[#24133F]"><Loader2 className="h-4 w-4 animate-spin text-[#7026B7]" /> Loading scan history…</div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E5E0EB] bg-white py-12 px-4 text-center">
                  <img
                    src={hawiQuestionImg}
                    alt="No scan records"
                    className="w-20 h-20 object-contain mb-2"
                  />
                  <p className="text-xs font-bold text-[#24133F]">No scan logs found</p>
                  <p className="text-[11px] text-[#756883] max-w-xs mt-0.5">
                    {scanError
                      ? 'Scan history is unavailable right now.'
                      : selectedEventId !== 'all' || filterType !== 'all'
                      ? 'No attendance records match the selected event or filter.'
                      : currentStudent.rfid_uid
                      ? 'This student has not checked into any event sessions yet.'
                      : 'No attendance scans recorded for this student.'}
                  </p>
                  {(selectedEventId !== 'all' || filterType !== 'all') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedEventId('all');
                        setFilterType('all');
                      }}
                      className="mt-3 text-xs"
                    >
                      Reset Filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Archive Student Confirmation Modal */}
      <Modal
        isOpen={isArchiveConfirmOpen}
        onClose={() => { if (!isArchiving) setIsArchiveConfirmOpen(false); }}
        title="Archive Student"
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <img src={hawiBoxImg} alt="Hawi with an archive box" className="mx-auto h-24 w-24 object-contain" />
          <p className="text-sm text-[#24133F] leading-relaxed">
            Are you sure you want to archive <span className="font-extrabold text-[#7026B7]">{currentStudent.name}</span> (<span className="font-extrabold text-[#24133F]">{currentStudent.student_id}</span>)?
          </p>

          <div className="space-y-2.5 text-xs text-[#756883] pt-1">
            <div className="flex items-start gap-2.5">
              <span className="text-amber-500 font-bold leading-relaxed">•</span>
              <span className="leading-relaxed">
                Moves <span className="font-bold text-[#24133F]">{currentStudent.name}</span> to the <strong className="text-[#24133F]">Archived roster</strong> (hidden from active attendance sessions).
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold leading-relaxed">•</span>
              <span className="leading-relaxed">
                Any linked RFID card {currentStudent.rfid_uid ? (<>(<span className="font-mono font-bold text-[#24133F]">{currentStudent.rfid_uid}</span>)</>) : ''} will be <strong className="text-[#24133F]">unassigned</strong> immediately.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold leading-relaxed">•</span>
              <span className="leading-relaxed">
                All historical event attendance records remain <strong className="text-[#24133F]">permanently preserved</strong>.
              </span>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={isArchiving}
              onClick={() => setIsArchiveConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              disabled={isArchiving}
              onClick={() => {
                if (!onArchiveStudent || isArchiving) return;
                setIsArchiving(true);
                void onArchiveStudent(currentStudent.id).then((success) => {
                  if (success) { setIsArchiveConfirmOpen(false); onClose(); }
                }).finally(() => setIsArchiving(false));
              }}
              leftIcon={isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            >
              Archive Student
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unlink RFID Card Confirmation Modal */}
      <Modal
        isOpen={isUnlinking}
        onClose={() => setIsUnlinking(false)}
        title="Return RFID Card"
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-[#24133F] leading-relaxed">
            Confirm you received card <span className="font-mono font-extrabold text-[#7026B7] bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">{currentStudent.rfid_uid}</span> from <span className="font-extrabold text-[#7026B7]">{currentStudent.name}</span> (<span className="font-extrabold text-[#24133F]">{currentStudent.student_id}</span>).
          </p>

          <div className="space-y-2.5 text-xs text-[#756883] pt-1">
            <div className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold leading-relaxed">•</span>
              <span className="leading-relaxed">
                Detaches this card from <span className="font-bold text-[#24133F]">{currentStudent.name}</span> immediately. Tapping it will no longer record attendance for this student.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-amber-500 font-bold leading-relaxed">•</span>
              <span className="leading-relaxed">
                The card UID becomes available to pair with any other student.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold leading-relaxed">•</span>
              <span className="leading-relaxed">
                All existing attendance logs and event check-ins remain <strong className="text-[#24133F]">safely preserved</strong>.
              </span>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsUnlinking(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={() => {
                setIsUnlinking(false);
                onUnlinkCard(currentStudent.id);
              }}
              leftIcon={<Unlink className="h-4 w-4" />}
            >
              Confirm return
            </Button>
          </div>
        </div>
      </Modal>

      {/* Profile Photo Centering & Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => {
          if (!isUploadingPhoto) {
            setIsCropModalOpen(false);
            setRawImageForCrop(null);
          }
        }}
        imageSrc={rawImageForCrop}
        onConfirmCrop={handleConfirmCrop}
        isSaving={isUploadingPhoto}
      />

      {/* Delete Student Confirmation Modal */}
      <DeleteStudentConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        student={currentStudent}
        onConfirmDelete={async (id) => {
          if (!onDeleteStudent) return false;
          const ok = await onDeleteStudent(id);
          if (ok) {
            setIsDeleteModalOpen(false);
            onClose();
          }
          return ok;
        }}
      />
    </Drawer>
  );
};
