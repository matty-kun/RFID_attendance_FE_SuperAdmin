import type { AttendanceRecord } from '../features/attendance/models';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO date
  user: {
    name: string;
    initials: string;
    role: string;
    avatarBg?: string;
    avatarColor?: string;
  };
  action: 'approved_attendance' | 'edited_schedule' | 'rejected_scan' | 'registered_rfid' | 'disabled_admin' | 'marked_not_verified' | string;
  actionLabel: string;
  badgeClass: string;
  description: string;
  relatedRecord: string;
}

export const auditLogRecords: AuditLogEntry[] = [
  {
    id: 'log-001',
    timestamp: '2026-10-02T13:12:00+08:00',
    user: {
      name: 'Admin Reyes',
      initials: 'AR',
      role: 'admin',
      avatarBg: 'bg-[#DFE8F8]',
      avatarColor: 'text-[#294B85]',
    },
    action: 'approved_attendance',
    actionLabel: 'Approved attendance',
    badgeClass: 'bg-[#10B981] text-white',
    description: 'Afternoon IN for Maria Santos',
    relatedRecord: 'ATT-0412',
  },
  {
    id: 'log-002',
    timestamp: '2026-10-02T12:58:00+08:00',
    user: {
      name: 'Super Admin',
      initials: 'SA',
      role: 'super_admin',
      avatarBg: 'bg-[#E9D5FF]',
      avatarColor: 'text-[#6D21A8]',
    },
    action: 'edited_schedule',
    actionLabel: 'Edited schedule',
    badgeClass: 'bg-[#E9D5FF] text-[#6D21A8]',
    description: 'Day 4 Afternoon IN window changed to 1:00 – 2:00 PM',
    relatedRecord: 'SCH-D4-AIN',
  },
  {
    id: 'log-003',
    timestamp: '2026-10-02T09:40:00+08:00',
    user: {
      name: 'Liza Mendoza',
      initials: 'LM',
      role: 'admin',
      avatarBg: 'bg-[#DFE8F8]',
      avatarColor: 'text-[#294B85]',
    },
    action: 'rejected_scan',
    actionLabel: 'Rejected scan',
    badgeClass: 'bg-[#EF4444] text-white',
    description: 'Duplicate scan for Carlo Reyes',
    relatedRecord: 'ATT-0388',
  },
  {
    id: 'log-004',
    timestamp: '2026-10-01T16:05:00+08:00',
    user: {
      name: 'Super Admin',
      initials: 'SA',
      role: 'super_admin',
      avatarBg: 'bg-[#E9D5FF]',
      avatarColor: 'text-[#6D21A8]',
    },
    action: 'registered_rfid',
    actionLabel: 'Registered RFID',
    badgeClass: 'bg-[#10B981] text-white',
    description: 'Card 04 A3 91 7C assigned to Maria Santos',
    relatedRecord: 'RFID-0120',
  },
  {
    id: 'log-005',
    timestamp: '2026-10-01T08:15:00+08:00',
    user: {
      name: 'Super Admin',
      initials: 'SA',
      role: 'super_admin',
      avatarBg: 'bg-[#E9D5FF]',
      avatarColor: 'text-[#6D21A8]',
    },
    action: 'disabled_admin',
    actionLabel: 'Disabled admin',
    badgeClass: 'bg-[#E2E8F0] text-[#475569]',
    description: 'Account disabled for Grace Villanueva',
    relatedRecord: 'ADM-004',
  },
  {
    id: 'log-006',
    timestamp: '2026-09-30T07:31:00+08:00',
    user: {
      name: 'Rafael Cortez',
      initials: 'RC',
      role: 'admin',
      avatarBg: 'bg-[#DFE8F8]',
      avatarColor: 'text-[#294B85]',
    },
    action: 'marked_not_verified',
    actionLabel: 'Marked not verified',
    badgeClass: 'bg-[#F59E0B] text-white',
    description: 'Unregistered card at Gate A',
    relatedRecord: 'ATT-0215',
  },
  {
    id: 'log-007',
    timestamp: '2026-09-30T07:15:00+08:00',
    user: {
      name: 'Admin Reyes',
      initials: 'AR',
      role: 'admin',
      avatarBg: 'bg-[#DFE8F8]',
      avatarColor: 'text-[#294B85]',
    },
    action: 'approved_attendance',
    actionLabel: 'Approved attendance',
    badgeClass: 'bg-[#10B981] text-white',
    description: 'Morning IN for Angela Cruz',
    relatedRecord: 'ATT-0210',
  },
  {
    id: 'log-008',
    timestamp: '2026-09-29T16:45:00+08:00',
    user: {
      name: 'Super Admin',
      initials: 'SA',
      role: 'super_admin',
      avatarBg: 'bg-[#E9D5FF]',
      avatarColor: 'text-[#6D21A8]',
    },
    action: 'edited_schedule',
    actionLabel: 'Edited schedule',
    badgeClass: 'bg-[#E9D5FF] text-[#6D21A8]',
    description: 'Extended Time Out grace period by 15 mins for Gymnasium Gate',
    relatedRecord: 'SCH-D3-AOUT',
  },
  {
    id: 'log-009',
    timestamp: '2026-09-29T14:20:00+08:00',
    user: {
      name: 'Liza Mendoza',
      initials: 'LM',
      role: 'admin',
      avatarBg: 'bg-[#DFE8F8]',
      avatarColor: 'text-[#294B85]',
    },
    action: 'approved_attendance',
    actionLabel: 'Approved attendance',
    badgeClass: 'bg-[#10B981] text-white',
    description: 'Manual override attendance for Jose Garcia (lost RFID)',
    relatedRecord: 'ATT-0182',
  },
  {
    id: 'log-010',
    timestamp: '2026-09-29T11:10:00+08:00',
    user: {
      name: 'Super Admin',
      initials: 'SA',
      role: 'super_admin',
      avatarBg: 'bg-[#E9D5FF]',
      avatarColor: 'text-[#6D21A8]',
    },
    action: 'registered_rfid',
    actionLabel: 'Registered RFID',
    badgeClass: 'bg-[#10B981] text-white',
    description: 'Card E2 80 11 70 assigned to Juan Dela Cruz',
    relatedRecord: 'RFID-0118',
  },
];

// Attendance Preview Datasets specifically tailored to match Figma Reports cards
export interface ReportTrendDay {
  day: string;
  present: number;
  absent: number;
  presentPct: number;
  absentPct: number;
}

export interface ReportSessionItem {
  name: string;
  expected: number;
  timeIns: number;
  timeOuts: number;
  noRecord: number;
  rate: string;
  rateBadgeColor: string;
}

export interface ReportCheckpointItem {
  name: string;
  inScans: number;
  outScans: number;
  total: number;
}

export interface ReportIssueItem {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  badgeBg: string;
}

export interface ReportCourseItem {
  course: string;
  expected: number;
  timeIn: number;
  timeOut: number;
}

export interface ReportStudentAttendanceRow {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  course: string;
  session: string;
  timeIn: string;
  timeOut: string;
  status: 'Completed' | 'Missing Out' | 'No Record';
}

export const defaultTrendDays: ReportTrendDay[] = [
  { day: 'Day 1', present: 420, absent: 80, presentPct: 75, absentPct: 20 },
  { day: 'Day 2', present: 438, absent: 62, presentPct: 78, absentPct: 18 },
  { day: 'Day 3', present: 465, absent: 35, presentPct: 85, absentPct: 12 },
  { day: 'Day 4', present: 385, absent: 115, presentPct: 68, absentPct: 25 },
];

export const defaultSessionBreakdown: ReportSessionItem[] = [
  { name: 'Day 1 - Morning', expected: 450, timeIns: 390, timeOuts: 382, noRecord: 60, rate: '60.90%', rateBadgeColor: 'bg-[#10B981]' },
  { name: 'Day 1 - Afternoon', expected: 450, timeIns: 340, timeOuts: 335, noRecord: 110, rate: '60.90%', rateBadgeColor: 'bg-[#EF4444]' },
  { name: 'Day 2 - Morning', expected: 450, timeIns: 365, timeOuts: 350, noRecord: 85, rate: '60.90%', rateBadgeColor: 'bg-[#F59E0B]' },
  { name: 'Day 2 - Afternoon', expected: 450, timeIns: 320, timeOuts: 310, noRecord: 130, rate: '60.90%', rateBadgeColor: 'bg-[#EF4444]' },
  { name: 'Day 3 - Morning', expected: 450, timeIns: 410, timeOuts: 405, noRecord: 40, rate: '60.90%', rateBadgeColor: 'bg-[#10B981]' },
  { name: 'Day 3 - Afternoon', expected: 450, timeIns: 375, timeOuts: 360, noRecord: 75, rate: '60.90%', rateBadgeColor: 'bg-[#F59E0B]' },
  { name: 'Day 4 - Morning', expected: 450, timeIns: 350, timeOuts: 340, noRecord: 100, rate: '60.90%', rateBadgeColor: 'bg-[#F59E0B]' },
  { name: 'Day 4 - Afternoon', expected: 450, timeIns: 405, timeOuts: 395, noRecord: 45, rate: '60.90%', rateBadgeColor: 'bg-[#10B981]' },
];

export const defaultCheckpoints: ReportCheckpointItem[] = [
  { name: 'Gym', inScans: 1240, outScans: 1180, total: 2420 },
  { name: 'Primera', inScans: 890, outScans: 840, total: 1730 },
  { name: 'ETD Court', inScans: 760, outScans: 710, total: 1470 },
  { name: 'Field', inScans: 620, outScans: 590, total: 1210 },
  { name: 'JBB', inScans: 540, outScans: 510, total: 1050 },
  { name: 'RSB Lobby', inScans: 480, outScans: 450, total: 930 },
];

export const defaultIssues: ReportIssueItem[] = [
  { id: 'issue-1', title: 'Duplicate Scans', subtitle: 'Multiple Scans', count: 18, badgeBg: 'bg-[#EF4444]' },
  { id: 'issue-2', title: 'Duplicate Scans', subtitle: 'Multiple Scans', count: 18, badgeBg: 'bg-[#F59E0B]' },
  { id: 'issue-3', title: 'Duplicate Scans', subtitle: 'Multiple Scans', count: 18, badgeBg: 'bg-[#3B82F6]' },
  { id: 'issue-4', title: 'Duplicate Scans', subtitle: 'Multiple Scans', count: 18, badgeBg: 'bg-[#EF4444]' },
  { id: 'issue-5', title: 'Duplicate Scans', subtitle: 'Multiple Scans', count: 18, badgeBg: 'bg-[#F59E0B]' },
];

export const defaultCourseBreakdown: ReportCourseItem[] = [
  { course: 'BSIT', expected: 450, timeIn: 410, timeOut: 395 },
  { course: 'BSBA', expected: 320, timeIn: 285, timeOut: 270 },
  { course: 'BSCS', expected: 210, timeIn: 195, timeOut: 190 },
  { course: 'BSED', expected: 180, timeIn: 165, timeOut: 160 },
  { course: 'BSHM', expected: 150, timeIn: 135, timeOut: 130 },
  { course: 'BSCRIM', expected: 140, timeIn: 125, timeOut: 120 },
];

export const defaultStudentRecords: ReportStudentAttendanceRow[] = [
  {
    id: 'stud-rec-1',
    name: 'Maria Santos',
    initials: 'MS',
    avatarBg: 'bg-[#E9D5FF]',
    avatarColor: 'text-[#6D21A8]',
    course: 'BSIT',
    session: 'Day 1 - Morning',
    timeIn: '8:00 AM',
    timeOut: '-',
    status: 'Missing Out',
  },
  {
    id: 'stud-rec-2',
    name: 'Maria Santos',
    initials: 'MS',
    avatarBg: 'bg-[#E9D5FF]',
    avatarColor: 'text-[#6D21A8]',
    course: 'BSIT',
    session: 'Day 1 - Morning',
    timeIn: '8:00 AM',
    timeOut: '-',
    status: 'Completed',
  },
  {
    id: 'stud-rec-3',
    name: 'Maria Santos',
    initials: 'MS',
    avatarBg: 'bg-[#E9D5FF]',
    avatarColor: 'text-[#6D21A8]',
    course: 'BSIT',
    session: 'Day 1 - Morning',
    timeIn: '-',
    timeOut: '-',
    status: 'No Record',
  },
  {
    id: 'stud-rec-4',
    name: 'Maria Santos',
    initials: 'MS',
    avatarBg: 'bg-[#E9D5FF]',
    avatarColor: 'text-[#6D21A8]',
    course: 'BSIT',
    session: 'Day 1 - Morning',
    timeIn: '8:00 AM',
    timeOut: '-',
    status: 'Completed',
  },
  {
    id: 'stud-rec-5',
    name: 'Maria Santos',
    initials: 'MS',
    avatarBg: 'bg-[#E9D5FF]',
    avatarColor: 'text-[#6D21A8]',
    course: 'BSIT',
    session: 'Day 1 - Morning',
    timeIn: '8:00 AM',
    timeOut: '-',
    status: 'Missing Out',
  },
  {
    id: 'stud-rec-6',
    name: 'Maria Santos',
    initials: 'MS',
    avatarBg: 'bg-[#E9D5FF]',
    avatarColor: 'text-[#6D21A8]',
    course: 'BSIT',
    session: 'Day 1 - Morning',
    timeIn: '8:00 AM',
    timeOut: '-',
    status: 'Completed',
  },
  {
    id: 'stud-rec-7',
    name: 'Maria Santos',
    initials: 'MS',
    avatarBg: 'bg-[#E9D5FF]',
    avatarColor: 'text-[#6D21A8]',
    course: 'BSIT',
    session: 'Day 1 - Morning',
    timeIn: '8:00 AM',
    timeOut: '-',
    status: 'Missing Out',
  },
  {
    id: 'stud-rec-8',
    name: 'Maria Santos',
    initials: 'MS',
    avatarBg: 'bg-[#E9D5FF]',
    avatarColor: 'text-[#6D21A8]',
    course: 'BSIT',
    session: 'Day 1 - Morning',
    timeIn: '8:00 AM',
    timeOut: '-',
    status: 'Completed',
  },
];

// Attendance records used by ReportsPage
const previewStudents = [
  { id: '2023-00124', name: 'Maria Santos', course: 'BSIT' },
  { id: '2023-00125', name: 'Carlo Reyes', course: 'BSIT' },
  { id: '2022-00418', name: 'Angela Cruz', course: 'BSBA' },
  { id: '2024-00231', name: 'Jose Garcia', course: 'BSCS' },
  { id: '2023-00642', name: 'Liza Mendoza', course: 'BSED' },
  { id: '2022-00377', name: 'Rafael Cortez', course: 'BSHM' },
];

const previewSessions = [
  'Day 1 - Morning',
  'Day 1 - Afternoon',
  'Day 2 - Morning',
  'Day 2 - Afternoon',
  'Day 3 - Morning',
  'Day 3 - Afternoon',
  'Day 4 - Morning',
  'Day 4 - Afternoon',
];

const previewLocations = ['Gym', 'Primera', 'ETD Court', 'Field', 'JBB', 'RSB Lobby'];

export const auditPreviewRecords: AttendanceRecord[] = Array.from({ length: 32 }, (_, index) => {
  const student = previewStudents[index % previewStudents.length];
  const sessionName = previewSessions[index % previewSessions.length];
  const locationName = previewLocations[index % previewLocations.length];
  const type = index % 3 === 0 ? 'time_out' : 'time_in';
  
  // Spread timestamps across the last 4 days including today
  const dayOffset = Math.floor(index / 8);
  const dateObj = new Date(Date.now() + 8 * 60 * 60 * 1000 - dayOffset * 24 * 60 * 60 * 1000);
  const day = dateObj.toISOString().slice(0, 10);
  const timeStr = type === 'time_in' ? '08:00' : '17:00';

  return {
    id: `preview-attendance-${index + 1}`,
    student_id: student.id,
    session_id: `preview-session-${(index % previewSessions.length) + 1}`,
    location_id: `preview-location-${(index % previewLocations.length) + 1}`,
    recorded_by: 'preview-admin',
    type,
    recorded_at: new Date(`${day}T${timeStr}:00+08:00`).toISOString(),
    student: { student_id: student.id, name: student.name, course: student.course },
    session: { name: sessionName },
    location: { name: locationName },
  };
});
