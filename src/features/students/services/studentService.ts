import { request } from '../../../services/apiClient';
import type { StudentRecord, RegisterStudentPayload } from '../models';

export const studentService = {
  getStudents: () => request.get<StudentRecord[]>('/students'),
  registerStudent: (payload: RegisterStudentPayload) =>
    request.post<StudentRecord>('/students', payload),
};
