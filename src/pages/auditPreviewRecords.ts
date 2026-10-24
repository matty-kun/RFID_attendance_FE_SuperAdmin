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

// Attendance records used by ReportsPage
const previewStudents = [
  { id: '2023-00124', name: 'Maria Santos', course: 'BSIT' },
  { id: '2023-00125', name: 'Carlo Reyes', course: 'BSIT' },
  { id: '2022-00418', name: 'Angela Cruz', course: 'BSBA' },
  { id: '2024-00231', name: 'Jose Garcia', course: 'BSCS' },
  { id: '2023-00642', name: 'Liza Mendoza', course: 'BSED' },
  { id: '2022-00377', name: 'Rafael Cortez', course: 'BSIT' },
];

export const auditPreviewRecords: AttendanceRecord[] = Array.from({ length: 18 }, (_, index) => {
  const group = Math.floor(index / 2);
  const student = previewStudents[group % previewStudents.length];
  const type = group === 8 ? 'time_in' : group === 7 ? 'time_out' : index % 2 === 0 ? 'time_out' : 'time_in';
  const day = new Date(Date.now() + 8 * 60 * 60 * 1000 - (Math.floor(group / 3) + 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    id: `preview-attendance-${index + 1}`,
    student_id: student.id,
    session_id: `preview-session-${(group % 2) + 1}`,
    location_id: `preview-location-${(index % 3) + 1}`,
    recorded_by: 'preview-admin',
    type,
    recorded_at: new Date(`${day}T${type === 'time_in' ? '08:00' : '17:00'}:00+08:00`).toISOString(),
    student: { student_id: student.id, name: student.name, course: student.course },
    session: { name: group % 2 === 0 ? 'Day Session' : 'Afternoon Session' },
    location: { name: ['Main Gate', 'Gymnasium', 'ETD Court'][index % 3] },
  };
});
