import { api } from '../../../services/apiClient';
import { StudentRecord, RegisterStudentPayload } from '../models';

export const studentService = {
  async getStudents(): Promise<StudentRecord[]> {
    try {
      const data: any = await api.get('/students');
      return data || [];
    } catch {
      // Mock seed data matching Supabase
      return [
        {
          id: '5a530cd1-fa4a-4778-8492-a419f215adf8',
          student_id: '2026-00001',
          name: 'Juan Dela Cruz',
          email: 'juan.delacruz@university.edu',
          course: 'BS Information Technology',
          year_level: 3,
          rfid_uid: 'E28011700000020B042F3401',
          created_at: new Date().toISOString(),
        },
        {
          id: '6b630cd2-fa4a-4778-8492-a419f215adf9',
          student_id: '2026-00002',
          name: 'Maria Santos',
          email: 'maria.santos@university.edu',
          course: 'BS Computer Science',
          year_level: 2,
          rfid_uid: 'E28011700000020B042F3402',
          created_at: new Date().toISOString(),
        },
        {
          id: '7c730cd3-fa4a-4778-8492-a419f215adfa',
          student_id: '2026-00003',
          name: 'Carlos Mendoza',
          email: 'carlos.mendoza@university.edu',
          course: 'BS Information Systems',
          year_level: 4,
          rfid_uid: null,
          created_at: new Date().toISOString(),
        },
      ];
    }
  },

  async registerStudent(payload: RegisterStudentPayload): Promise<StudentRecord> {
    try {
      const data: any = await api.post('/students', payload);
      return data;
    } catch {
      return {
        id: `stu-${Date.now()}`,
        student_id: payload.student_id,
        name: payload.name,
        email: payload.email || null,
        course: payload.course || null,
        year_level: payload.year_level || null,
        rfid_uid: payload.rfid_uid || null,
        created_at: new Date().toISOString(),
      };
    }
  },
};
