import { request } from '../../../services/apiClient';
import type { StudentRecord, StudentPage, StudentRosterStats, RegisterStudentPayload, UpdateStudentPayload } from '../models';

export const studentService = {
  getStudents: (page = 1, q = '', sort = 'created_at', direction = 'desc', limit = 25, archived = false) =>
    request.get<StudentPage>('/students', { params: { page, limit, sort, direction, archived, ...(q ? { q } : {}) } }),
  getRosterStats: () => request.get<StudentRosterStats>('/students/stats'),
  registerStudent: (payload: RegisterStudentPayload) =>
    request.post<StudentRecord>('/students', payload),
  updateStudent: (id: string, payload: UpdateStudentPayload) =>
    request.patch<StudentRecord>(`/students/${id}`, payload),
  resetPassword: (id: string, password: string) =>
    request.patch<StudentRecord>(`/students/${id}`, { password }),
  archiveStudent: (id: string) => request.post<StudentRecord>(`/students/${id}/archive`, {}),
  restoreStudent: (id: string) => request.post<StudentRecord>(`/students/${id}/restore`, {}),
  uploadAvatar: (id: string, imageBase64: string) =>
    request.post<{ avatar_url: string }>(`/students/${id}/avatar`, { image: imageBase64 }),
  removeAvatar: (id: string) => request.delete<{ avatar_url: null }>(`/students/${id}/avatar`),
  deleteStudent: (id: string) =>
    request.delete<{ deleted_student_id: string; deleted_student_name: string; unlinked_rfid_uid: string | null }>(`/students/${id}`),
};
