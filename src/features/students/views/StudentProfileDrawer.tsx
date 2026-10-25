import React, { useState, useMemo, useRef } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Button } from '../../../components/common/Button';
import { toast } from '../../../context';
import {
  Copy,
  Check,
  Unlink,
  Zap,
  Link as LinkIcon,
  X,
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
  onUnlinkCard: (studentId: string) => void;
  onQuickPair: (studentId: string, cardUid: string) => void;
  onOpenRapidScan: () => void;
}

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
}) => {
  const [filterType, setFilterType] = useState<'all' | 'time_in' | 'time_out'>('all');
  const [copiedUid, setCopiedUid] = useState(false);

  // Cache student reference so the drawer can animate out smoothly when closing
  const activeStudentRef = useRef<StudentRecord | null>(student);
  if (student) {
    activeStudentRef.current = student;
  }
  const currentStudent = student || activeStudentRef.current;

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
      onClose={onClose}
      maxWidth="2xl"
      hideHeader
      noPadding
    >
      <div className="flex flex-col min-h-full bg-white select-none">
        {/* Duolingo-style Top Hero Banner with Smooth Fog Transition */}
        <div className="relative bg-[#78C9FC] px-6 pt-5 pb-0 flex flex-col justify-between min-h-[230px] overflow-hidden">
          {/* Top Bar inside banner */}
          <div className="flex items-center justify-between z-20">
            <h2 className="text-2xl font-black text-[#15344F] tracking-tight">
              {currentStudent.name}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 hover:bg-white text-[#15344F] shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
            </button>
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
          <div>
            <p className="text-xs font-extrabold text-[#756883] uppercase tracking-wider">
              @{currentStudent.student_id} · ENROLLED {currentStudent.created_at ? new Date(currentStudent.created_at).getFullYear() : '2023'}
            </p>
          </div>

          {/* 3D Tactile Card Action Button (Signature components) */}
          {currentStudent.rfid_uid ? (
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
                onClick={() => onUnlinkCard(currentStudent.id)}
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
          )}

          {/* OVERVIEW SECTION (Academic Details) */}
          <div className="pt-1">
            <p className="text-[11px] font-black tracking-wider text-[#A59AAB] uppercase">
              Overview
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3 shadow-2xs">
                <p className="text-[10px] font-bold text-[#756883] uppercase">Program / Course</p>
                <p className="font-bold text-[#24133F] mt-0.5">{currentStudent.course || '—'}</p>
              </div>
              <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3 shadow-2xs">
                <p className="text-[10px] font-bold text-[#756883] uppercase">Year Level</p>
                <p className="font-bold text-[#24133F] mt-0.5">{yearLabel(currentStudent.year_level)}</p>
              </div>
            </div>
          </div>

          {/* SCAN HISTORY SECTION WITH FOG BELOW */}
          <div className="pt-2 space-y-2.5 relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-[11px] font-black tracking-wider text-[#A59AAB] uppercase">
                Scan History
              </p>

              {/* Segmented Filter Pills (Replaces awkward dropdown menu on the side) */}
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

            {/* Timeline: Natural flow scrolling with drawer all the way down */}
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
                            {/* Left: Session name & details */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[#24133F]">
                                  {scan.sessionName}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    scan.status === 'on_time'
                                      ? 'bg-emerald-50 text-[#16883F]'
                                      : scan.status === 'late'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  <i
                                    className={`h-1 w-1 rounded-full ${
                                      scan.status === 'on_time'
                                        ? 'bg-[#17B556]'
                                        : scan.status === 'late'
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                  />
                                  {scan.status === 'on_time'
                                    ? 'On time'
                                    : scan.status === 'late'
                                    ? 'Late'
                                    : 'Missed'}
                                </span>
                              </div>

                              <p className="text-[11px] text-[#756883] mt-0.5">
                                <span>Window {scan.timeWindow}</span>
                                <span className="mx-1.5 text-[#D2C5E0]">·</span>
                                <span>{scan.locationName}</span>
                              </p>
                            </div>

                            {/* Right: Exact timestamp & verification */}
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
        </div>
      </div>
    </Drawer>
  );
};
