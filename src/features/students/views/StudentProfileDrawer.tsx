import React, { useState, useMemo } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Dropdown } from '../../../components/common/Dropdown';
import {
  Copy,
  Check,
  Unlink,
  Zap,
  Link as LinkIcon,
} from 'lucide-react';
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

  const initials = useMemo(() => {
    if (!student?.name) return '??';
    return student.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
  }, [student?.name]);

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

  if (!student) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Student Profile & Scans"
      description="Academic credentials, card status, and event attendance timeline."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Unified Identity & RFID Card Card (Zero nested boxes) */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-white overflow-hidden shadow-xs">
          {/* Top Profile Summary */}
          <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FAF8FC] border border-[#E5E0EB] text-sm font-bold text-[#7026B7]">
                {initials}
              </span>
              <div>
                <h3 className="text-base font-bold text-[#24133F] leading-tight">
                  {student.name}
                </h3>
                <p className="text-xs text-[#756883] mt-1">
                  <span className="font-mono font-medium text-[#24133F]">{student.student_id}</span>
                  <span className="mx-1.5 text-[#D2C5E0]">·</span>
                  <span>{student.course || '—'}</span>
                  <span className="mx-1.5 text-[#D2C5E0]">·</span>
                  <span>{yearLabel(student.year_level)}</span>
                </p>
                {student.email && (
                  <p className="text-[11px] text-[#A59AAB] mt-0.5">{student.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Integrated RFID Credential Bar (1px hairline divider) */}
          <div className="border-t border-[#F0E8FC] bg-[#FAF8FC] px-4 sm:px-5 py-3">
            {student.rfid_uid ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#756883]">Card UID:</span>
                  <span className="font-mono text-xs font-bold text-[#24133F] tracking-tight">
                    {student.rfid_uid}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleCopyUid}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#756883] hover:text-[#24133F] bg-white hover:bg-[#FAF8FC] border border-[#E5E0EB] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedUid ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedUid ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUnlinkCard(student.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    <span>Unlink</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <span className="text-xs text-[#756883]">No RFID card linked to student</span>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {availableCards.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onQuickPair(student.id, availableCards[0].uid)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      <span>Pair #{availableCards[0].cardNumber}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRapidScan();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[#7026B7] hover:bg-[#621FA3] px-2.5 py-1 rounded-lg shadow-[0_2px_0_0_#451475] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  >
                    <Zap className="h-3 w-3 fill-current" />
                    <span>Scan card</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scan History Section Header */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#24133F]">
                Event Scan History
              </h4>
              <p className="text-[11px] text-[#756883]">
                Time-in and time-out records across all event days
              </p>
            </div>

            {/* Filter by scan type */}
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

          {/* Unified Timeline Ledger (Single container, hairline date dividers, zero toy icons) */}
          {groupedScans.length > 0 ? (
            <div className="rounded-2xl border border-[#E5E0EB] bg-white overflow-hidden shadow-xs divide-y divide-[#E5E0EB]">
              {groupedScans.map((group) => (
                <div key={`${group.event}-${group.date}`}>
                  {/* Subtle Date Header */}
                  <div className="flex items-center justify-between bg-[#FAF8FC] px-4 py-2 text-xs">
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
        </div>
      </div>
    </Drawer>
  );
};
