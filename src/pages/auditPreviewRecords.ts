import type { AttendanceRecord } from '../features/attendance/models';

const students = [
  { id: '2023-00124', name: 'Maria Santos', course: 'BSIT' },
  { id: '2023-00125', name: 'Carlo Reyes', course: 'BSIT' },
  { id: '2022-00418', name: 'Angela Cruz', course: 'BSBA' },
  { id: '2024-00231', name: 'Jose Garcia', course: 'BSCS' },
  { id: '2023-00642', name: 'Liza Mendoza', course: 'BSED' },
  { id: '2022-00377', name: 'Rafael Cortez', course: 'BSIT' },
];

export const auditPreviewRecords: AttendanceRecord[] = Array.from({ length: 18 }, (_, index) => {
  const group = Math.floor(index / 2);
  const student = students[group % students.length];
  const type = group === 8 ? 'time_in' : group === 7 ? 'time_out' : index % 2 === 0 ? 'time_out' : 'time_in';
  const day = new Date(Date.now() + 8 * 60 * 60 * 1000 - (Math.floor(group / 3) + 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    id: `preview-attendance-${index + 1}`,
    student_id: student.id,
    session_id: `preview-session-${group % 2 + 1}`,
    location_id: `preview-location-${index % 3 + 1}`,
    recorded_by: 'preview-admin',
    type,
    recorded_at: new Date(`${day}T${type === 'time_in' ? '08:00' : '17:00'}:00+08:00`).toISOString(),
    student: { student_id: student.id, name: student.name, course: student.course },
    session: { name: group % 2 === 0 ? 'Day Session' : 'Afternoon Session' },
    location: { name: ['Main Gate', 'Gymnasium', 'ETD Court'][index % 3] },
  };
});
