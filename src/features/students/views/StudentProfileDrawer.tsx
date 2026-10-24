import React, { useState, useMemo } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Dropdown } from '../../../components/common/Dropdown';
import {
  Radio,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
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

  // If student has no RFID card, they have no recorded scans yet
  if (!student.rfid_uid) return [];

  const uid = student.rfid_uid;
  const isMaria = student.name.toLowerCase().includes('maria');
  const isCarlo = student.name.toLowerCase().includes('carlo');
  const isJson = student.name.toLowerCase().includes('json');

  // Baseline standard multi-day event attendance (Cite Festival · 4 Days)
  const scans: StudentScanItem[] = [
    // Day 1
    {
      id: 'scan-1',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 1',
      dateStr: 'October 2, 2026',
      sessionName: 'Morning - Time IN',
      type: 'time_in',
      status: 'on_time',
      timestamp: isMaria ? '07:44 AM' : isCarlo ? '07:58 AM' : '08:12 AM',
      timeWindow: '7:00 AM - 9:00 AM',
      locationName: 'Cite Building - Gate 1',
      kioskName: 'Kiosk #1 (RFID Auto-Reader)',
      rfidUid: uid,
    },
    {
      id: 'scan-2',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 1',
      dateStr: 'October 2, 2026',
      sessionName: 'Afternoon - Time OUT',
      type: 'time_out',
      status: 'on_time',
      timestamp: isMaria ? '05:12 PM' : isCarlo ? '05:04 PM' : '04:58 PM',
      timeWindow: '4:00 PM - 6:00 PM',
      locationName: 'Cite Building - Main Exit',
      kioskName: 'Kiosk #2 (RFID Auto-Reader)',
      rfidUid: uid,
    },
    // Day 2
    {
      id: 'scan-3',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 2',
      dateStr: 'October 3, 2026',
      sessionName: 'Morning - Time IN',
      type: 'time_in',
      status: 'on_time',
      timestamp: isMaria ? '07:38 AM' : isCarlo ? '08:02 AM' : '07:50 AM',
      timeWindow: '7:00 AM - 9:00 AM',
      locationName: 'Cite Building - Gate 1',
      kioskName: 'Kiosk #1 (RFID Auto-Reader)',
      rfidUid: uid,
    },
    {
      id: 'scan-4',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 2',
      dateStr: 'October 3, 2026',
      sessionName: 'Afternoon - Time OUT',
      type: 'time_out',
      status: isJson ? 'missed' : 'on_time',
      timestamp: isJson ? undefined : isMaria ? '05:35 PM' : '05:10 PM',
      timeWindow: '4:00 PM - 6:00 PM',
      locationName: 'Cite Building - Main Exit',
      kioskName: 'Kiosk #2 (RFID Auto-Reader)',
      rfidUid: isJson ? undefined : uid,
    },
    // Day 3
    {
      id: 'scan-5',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 3',
      dateStr: 'October 4, 2026',
      sessionName: 'Morning - Time IN',
      type: 'time_in',
      status: isCarlo ? 'late' : 'on_time',
      timestamp: isCarlo ? '09:14 AM' : isMaria ? '07:51 AM' : '08:05 AM',
      timeWindow: '7:00 AM - 9:00 AM',
      locationName: 'Gymnasium Entrance',
      kioskName: 'Kiosk #4 (Mobile Tablet Reader)',
      rfidUid: uid,
    },
    {
      id: 'scan-6',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 3',
      dateStr: 'October 4, 2026',
      sessionName: 'Afternoon - Time OUT',
      type: 'time_out',
      status: 'on_time',
      timestamp: isMaria ? '05:08 PM' : isCarlo ? '05:22 PM' : '05:01 PM',
      timeWindow: '4:00 PM - 6:00 PM',
      locationName: 'Gymnasium Exit',
      kioskName: 'Kiosk #4 (Mobile Tablet Reader)',
      rfidUid: uid,
    },
    // Day 4
    {
      id: 'scan-7',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 4',
      dateStr: 'October 5, 2026',
      sessionName: 'Morning - Time IN',
      type: 'time_in',
      status: 'on_time',
      timestamp: isMaria ? '07:49 AM' : isCarlo ? '07:55 AM' : '08:02 AM',
      timeWindow: '7:00 AM - 9:00 AM',
      locationName: 'Cite Building - Gate 1',
      kioskName: 'Kiosk #1 (RFID Auto-Reader)',
      rfidUid: uid,
    },
    {
      id: 'scan-8',
      eventId: 'ev-1',
      eventName: 'Cite Festival 2026',
      dayLabel: 'Day 4',
      dateStr: 'October 5, 2026',
      sessionName: 'Afternoon - Time OUT',
      type: 'time_out',
      status: 'on_time',
      timestamp: isMaria ? '04:55 PM' : isCarlo ? '05:15 PM' : '05:05 PM',
      timeWindow: '4:00 PM - 6:00 PM',
      locationName: 'Cite Building - Main Exit',
      kioskName: 'Kiosk #2 (RFID Auto-Reader)',
      rfidUid: uid,
    },
  ];

  return scans;
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

  const totalRecorded = scans.filter((s) => s.status !== 'missed').length;
  const onTimeCount = scans.filter((s) => s.status === 'on_time').length;
  const onTimePercent = totalRecorded > 0 ? Math.round((onTimeCount / totalRecorded) * 100) : 0;

  if (!student) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Student Profile & Scans"
      description="Academic credentials, card status, and event attendance timeline."
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-[#756883]">
            {student.rfid_uid ? (
              <span>Card active · {scans.length} scans logged</span>
            ) : (
              <span className="text-amber-700 font-medium">Card not linked</span>
            )}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#756883] hover:text-[#24133F] transition-colors"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Student Profile Hero Header Card */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#DFE8F8] text-base font-extrabold text-[#294B85] shadow-xs">
                {initials}
              </span>
              <div>
                <h3 className="text-base font-extrabold text-[#24133F] leading-tight">
                  {student.name}
                </h3>
                <p className="text-xs font-mono font-semibold text-[#7026B7] mt-0.5">
                  ID: {student.student_id}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#756883]">
                  <span className="font-medium text-[#24133F]">{student.course || '—'}</span>
                  <span>·</span>
                  <span>{yearLabel(student.year_level)}</span>
                  {student.email && (
                    <>
                      <span>·</span>
                      <span className="text-[#A59AAB]">{student.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Attendance Score Chip */}
            {student.rfid_uid && totalRecorded > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-right shrink-0">
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                  On-Time Rate
                </p>
                <p className="text-lg font-extrabold text-emerald-700 leading-tight tabular-nums mt-0.5">
                  {onTimePercent}%
                </p>
                <p className="text-[10px] text-emerald-600 font-medium">
                  {onTimeCount}/{totalRecorded} on time
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RFID Card Status Card */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#756883] uppercase tracking-wide">
              RFID Card Credentials
            </span>
            {student.rfid_uid ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <i className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active &amp; Linked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                <i className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unassigned
              </span>
            )}
          </div>

          {student.rfid_uid ? (
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[#E5E0EB] bg-white p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-[#7026B7]">
                  <Radio className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#A59AAB] uppercase">Physical Card UID</p>
                  <p className="font-mono text-xs font-bold text-[#24133F] tracking-tight">
                    {student.rfid_uid}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleCopyUid}
                  title="Copy Card UID"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#756883] hover:text-[#24133F] bg-[#FAF8FC] hover:bg-[#F0E8FC] border border-[#E5E0EB] px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  {copiedUid ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedUid ? 'Copied' : 'Copy UID'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUnlinkCard(student.id)}
                  title="Unlink Card"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  <span>Unlink</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-[#D2C5E0] bg-white p-3.5 text-center">
              <p className="text-xs font-bold text-[#24133F]">No card linked to this student</p>
              <p className="text-[11px] text-[#756883] mt-0.5 max-w-sm mx-auto">
                Pair an unassigned card from the inventory pool or swipe with the rapid desktop scanner.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                {availableCards.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onQuickPair(student.id, availableCards[0].uid)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>Pair Card #{availableCards[0].cardNumber}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRapidScan();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#7026B7] hover:bg-[#621FA3] shadow-[0_3px_0_0_#451475] active:translate-y-[1px] active:shadow-none px-3 py-1.5 rounded-xl transition-all"
                >
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>Open Rapid Scanner</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scan History Section Header */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-extrabold text-[#24133F]">
                Event Scan History
              </h4>
              <p className="text-[11px] text-[#756883]">
                Time-In and Time-Out timestamps across multi-day events.
              </p>
            </div>

            {/* Filter by scan type */}
            {scans.length > 0 && (
              <Dropdown
                value={filterType}
                onChange={(val) => setFilterType(val as 'all' | 'time_in' | 'time_out')}
                options={[
                  { value: 'all', label: `All Scans (${scans.length})` },
                  { value: 'time_in', label: 'Time-In Only' },
                  { value: 'time_out', label: 'Time-Out Only' },
                ]}
              />
            )}
          </div>

          {/* Timeline Node List */}
          {groupedScans.length > 0 ? (
            <div className="space-y-4">
              {groupedScans.map((group) => (
                <div
                  key={`${group.event}-${group.date}`}
                  className="rounded-2xl border border-[#E5E0EB] bg-white overflow-hidden shadow-xs"
                >
                  {/* Event Day Header */}
                  <div className="flex items-center justify-between border-b border-[#F0E8FC] bg-[#FAF8FC] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-[#7026B7]" />
                      <span className="text-xs font-bold text-[#24133F]">{group.event}</span>
                      <span className="text-[11px] font-semibold text-[#7026B7] bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md">
                        {group.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-[#756883]">{group.date}</span>
                  </div>

                  {/* Scans List for this Day */}
                  <div className="divide-y divide-[#F0E8FC] px-4 py-2">
                    {group.items.map((scan) => (
                      <div key={scan.id} className="flex items-start justify-between py-3 gap-3">
                        {/* Left: Indicator & Session Info */}
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                              scan.status === 'missed'
                                ? 'bg-slate-100 text-slate-400'
                                : scan.type === 'time_in'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {scan.status === 'missed' ? (
                              <AlertCircle className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-[#24133F]">
                                {scan.sessionName}
                              </p>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  scan.status === 'on_time'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : scan.status === 'late'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {scan.status === 'on_time'
                                  ? 'On Time'
                                  : scan.status === 'late'
                                  ? 'Late'
                                  : 'Missed'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#756883]">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-[#A59AAB]" />
                                Window: {scan.timeWindow}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-[#A59AAB]" />
                                {scan.locationName}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Timestamp and Verification */}
                        <div className="text-right shrink-0">
                          {scan.timestamp ? (
                            <div>
                              <p className="font-mono text-xs font-extrabold text-[#24133F]">
                                {scan.timestamp}
                              </p>
                              <p className="text-[10px] font-medium text-emerald-700 flex items-center justify-end gap-1 mt-0.5">
                                <CheckCircle2 className="h-3 w-3" />
                                RFID Verified
                              </p>
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400 italic">
                              No scan recorded
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
