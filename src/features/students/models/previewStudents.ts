import type { StudentRecord, InventoryCard } from './index';

export const previewStudents: StudentRecord[] = [
  { id: 'preview-1', student_id: '2023-00124', name: 'Maria Santos', email: 'maria@example.test', course: 'BS Information Technology', year_level: 3, rfid_uid: 'E28011700000020B042F3401', created_at: '2026-09-01T08:00:00Z' },
  { id: 'preview-2', student_id: '2023-00125', name: 'Carlo Reyes', email: 'carlo@example.test', course: 'BS Information Technology', year_level: 3, rfid_uid: 'E28011700000020B042F3402', created_at: '2026-09-01T08:10:00Z' },
  { id: 'preview-3', student_id: '2024-00231', name: 'Angela Cruz', email: 'angela@example.test', course: 'BS Business Administration', year_level: 2, rfid_uid: null, created_at: '2026-09-02T09:00:00Z' },
  { id: 'preview-4', student_id: '2022-00418', name: 'Mat Santos', email: 'mat@example.test', course: 'BS Computer Science', year_level: 4, rfid_uid: null, created_at: '2026-09-02T09:10:00Z' },
  { id: 'preview-5', student_id: '2023-00642', name: 'Json Reyes', email: 'json@example.test', course: 'BS Information Technology', year_level: 3, rfid_uid: 'E28011700000020B042F3405', created_at: '2026-09-03T09:00:00Z' },
  { id: 'preview-6', student_id: '2024-00512', name: 'Bea Alonzo', email: 'bea@example.test', course: 'BS Computer Science', year_level: 1, rfid_uid: null, created_at: '2026-09-04T08:30:00Z' },
  { id: 'preview-7', student_id: '2023-00891', name: 'Daniel Padilla', email: 'daniel@example.test', course: 'BS Information Systems', year_level: 2, rfid_uid: null, created_at: '2026-09-04T09:00:00Z' },
];

export const previewInventoryCards: InventoryCard[] = [
  { id: 'inv-1', cardNumber: 1, uid: 'E28011700000020B042F3401', status: 'assigned', assignedToStudentId: 'preview-1', assignedToStudentName: 'Maria Santos', registeredAt: '2026-09-01T07:45:00Z' },
  { id: 'inv-2', cardNumber: 2, uid: 'E28011700000020B042F3402', status: 'assigned', assignedToStudentId: 'preview-2', assignedToStudentName: 'Carlo Reyes', registeredAt: '2026-09-01T07:46:00Z' },
  { id: 'inv-3', cardNumber: 3, uid: 'E28011700000020B042F3403', status: 'unassigned', registeredAt: '2026-09-01T07:47:00Z' },
  { id: 'inv-4', cardNumber: 4, uid: 'E28011700000020B042F3404', status: 'unassigned', registeredAt: '2026-09-01T07:48:00Z' },
  { id: 'inv-5', cardNumber: 5, uid: 'E28011700000020B042F3405', status: 'assigned', assignedToStudentId: 'preview-5', assignedToStudentName: 'Json Reyes', registeredAt: '2026-09-01T07:49:00Z' },
  { id: 'inv-6', cardNumber: 6, uid: 'E28011700000020B042F3406', status: 'unassigned', registeredAt: '2026-09-01T07:50:00Z' },
  { id: 'inv-7', cardNumber: 7, uid: 'E28011700000020B042F3407', status: 'unassigned', registeredAt: '2026-09-01T07:51:00Z' },
  { id: 'inv-8', cardNumber: 8, uid: 'E28011700000020B042F3408', status: 'unassigned', registeredAt: '2026-09-01T07:52:00Z' },
];
