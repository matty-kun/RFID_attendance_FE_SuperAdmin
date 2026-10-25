import React, { useState, useMemo } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Dropdown } from '../../../components/common/Dropdown';
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

  const scans = useMemo(() => generateStudentScans(student), [student]);

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
    if (!student?.rfid_uid) return;
    navigator.clipboard.writeText(student.rfid_uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const yearLabel = (year?: number | null) =>
    year ? `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year` : '—';

  const totalRecorded = scans.filter((s) => s.status !== 'missed').length;
  const onTimeCount = scans.filter((s) => s.status === 'on_time').length;
  const onTimePercent = totalRecorded > 0 ? Math.round((onTimeCount / totalRecorded) * 100) : 0;

  if (!student) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      hideHeader
      noPadding
    >
      <div className="flex flex-col min-h-full bg-white select-none">
        {/* Duolingo-style Top Hero Banner */}
        <div className="relative bg-[#78C9FC] px-6 pt-5 pb-0 flex flex-col justify-between min-h-[200px] border-b border-[#60B9F0] overflow-hidden">
          {/* Top Bar inside banner */}
          <div className="flex items-center justify-between z-10">
            <h2 className="text-2xl font-black text-[#15344F] tracking-tight">
              {student.name}
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
          <div className="flex justify-center items-end mt-2 z-0">
            <img
              src={hawiWavingImg}
              alt="Student Character"
              className="h-32 w-auto object-contain drop-shadow-md pointer-events-none"
            />
          </div>
        </div>

        {/* Content Area Below Banner */}
        <div className="flex-1 p-5 space-y-4">
          {/* Subheading Handle */}
          <div>
            <p className="text-xs font-extrabold text-[#756883] uppercase tracking-wider">
              @{student.student_id} · ENROLLED {student.created_at ? new Date(student.created_at).getFullYear() : '2023'}
            </p>
          </div>

          {/* Horizontal Stats Strip (Courses / Following / Followers style) */}
          <div className="grid grid-cols-3 gap-2 py-3 rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] text-center">
            <div>
              <p className="text-xl font-black text-[#24133F] tabular-nums">{scans.length}</p>
              <p className="text-[11px] font-bold text-[#756883]">Total Scans</p>
            </div>
            <div>
              <p className="text-xl font-black text-[#16883F] tabular-nums">{onTimePercent}%</p>
              <p className="text-[11px] font-bold text-[#756883]">On-Time</p>
            </div>
            <div>
              <p className="text-xl font-black text-[#7026B7]">
                {student.rfid_uid ? 'Active' : 'None'}
              </p>
              <p className="text-[11px] font-bold text-[#756883]">RFID Status</p>
            </div>
          </div>

          {/* 3D Tactile Card Action Button (Duolingo ADD FRIENDS style) */}
          {student.rfid_uid ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyUid}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-[#E5E0EB] bg-white py-2.5 px-3 text-xs font-extrabold text-[#24133F] shadow-[0_3px_0_0_#D1D5DB] hover:bg-[#FAF8FC] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                {copiedUid ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-[#756883]" />}
                <span className="font-mono">Card UID: {student.rfid_uid}</span>
              </button>

              <button
                type="button"
                onClick={() => onUnlinkCard(student.id)}
                className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-extrabold text-rose-700 shadow-[0_3px_0_0_#FECDD3] hover:bg-rose-100 active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                title="Unlink RFID Card"
              >
                <Unlink className="h-4 w-4" />
                <span>Unlink</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {availableCards.length > 0 && (
                <button
                  type="button"
                  onClick={() => onQuickPair(student.id, availableCards[0].uid)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-200 bg-emerald-50 py-2.5 text-xs font-extrabold text-emerald-700 shadow-[0_3px_0_0_#A7F3D0] hover:bg-emerald-100 active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                >
                  <LinkIcon className="h-4 w-4" />
                  <span>Pair Card #{availableCards[0].cardNumber}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRapidScan();
                }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#7026B7] px-4 py-2.5 text-xs font-extrabold text-white shadow-[0_3px_0_0_#451475] hover:bg-[#621FA3] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4 fill-current" />
                <span>Scan card</span>
              </button>
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
                <p className="font-bold text-[#24133F] mt-0.5">{student.course || '—'}</p>
              </div>
              <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3 shadow-2xs">
                <p className="text-[10px] font-bold text-[#756883] uppercase">Year Level</p>
                <p className="font-bold text-[#24133F] mt-0.5">{yearLabel(student.year_level)}</p>
              </div>
            </div>
          </div>

          {/* SCAN HISTORY SECTION WITH FOG BELOW */}
          <div className="pt-2 space-y-2 relative">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black tracking-wider text-[#A59AAB] uppercase">
                Scan History
              </p>
              {scans.length > 0 && (
                <Dropdown
                  value={filterType}
                  onChange={(val) => setFilterType(val as 'all' | 'time_in' | 'time_out')}
                  options={[
                    { value: 'all', label: `All Scans (${scans.length})` },
                    { value: 'time_in', label: 'Time-In only' },
                    { value: 'time_out', label: 'Time-Out only' },
                  ]}
                />
              )}
            </div>

            {/* Timeline with Bottom Fog Fade */}
            <div className="relative">
              {groupedScans.length > 0 ? (
                <div className="rounded-2xl border border-[#E5E0EB] bg-white overflow-hidden shadow-xs divide-y divide-[#E5E0EB] max-h-[380px] overflow-y-auto relative scroll-smooth">
                  {groupedScans.map((group) => (
                    <div key={`${group.event}-${group.date}`}>
                      {/* Subtle Date Header */}
                      <div className="sticky top-0 z-10 flex items-center justify-between bg-[#FAF8FC]/95 backdrop-blur-xs px-4 py-2 text-xs border-b border-[#F0E8FC]">
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
                                <div>
                                  <p className="font-mono text-xs font-bold text-[#24133F] tabular-nums">
                                    {scan.timestamp}
                                  </p>
                                  <p className="text-[10px] text-[#16883F] font-medium mt-0.5">
                                    Verified
                                  </p>
                                </div>
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
                    {student.rfid_uid
                      ? 'This student has not checked into any event sessions yet.'
                      : 'Link an RFID card first to track automatic event attendance.'}
                  </p>
                </div>
              )}

              {/* Frosted Bottom Fog Fade: Smooth peek gradient so user can see history of scans underneath */}
              {groupedScans.length > 0 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 inset-x-0 h-16 rounded-b-2xl bg-gradient-to-t from-white via-white/80 to-transparent backdrop-blur-[1px]"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
