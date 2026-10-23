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
  const student = students[index % students.length];
  const type = index % 3 === 0 ? 'time_out' : 'time_in';
  return {
    id: `preview-attendance-${index + 1}`,
    student_id: student.id,
    session_id: `preview-session-${index % 2 + 1}`,
    location_id: `preview-location-${index % 3 + 1}`,
    recorded_by: 'preview-admin',
    type,
    recorded_at: new Date(Date.now() - index * 42 * 60 * 1000).toISOString(),
    student: { student_id: student.id, name: student.name, course: student.course },
    session: { name: index % 2 === 0 ? 'Morning Session' : 'Afternoon Session' },
    location: { name: ['Main Gate', 'Gymnasium', 'ETD Court'][index % 3] },
  };
});
