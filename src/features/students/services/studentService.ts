import { request } from '../../../services/apiClient';
import type { StudentRecord, StudentPage, RegisterStudentPayload, UpdateStudentPayload } from '../models';

export const studentService = {
  getStudents: (page = 1, q = '', sort = 'created_at', direction = 'desc') =>
    request.get<StudentPage>('/students', { params: { page, limit: 25, sort, direction, ...(q ? { q } : {}) } }),
  registerStudent: (payload: RegisterStudentPayload) =>
    request.post<StudentRecord>('/students', payload),
  updateStudent: (id: string, payload: UpdateStudentPayload) =>
    request.patch<StudentRecord>(`/students/${id}`, payload),
  uploadAvatar: (id: string, imageBase64: string) =>
    request.post<{ avatar_url: string }>(`/students/${id}/avatar`, { image: imageBase64 }),
  removeAvatar: (id: string) => request.delete<{ avatar_url: null }>(`/students/${id}/avatar`),
  deleteStudent: (id: string) =>
    request.delete<{ deleted_student_id: string; deleted_student_name: string; unlinked_rfid_uid: string | null }>(`/students/${id}`),
};
