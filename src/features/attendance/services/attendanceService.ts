import { api } from '../../../services/apiClient';
import { AttendanceRecord, ScanTelemetryPayload } from '../models';

export const attendanceService = {
  async getRecentAttendance(limit = 30): Promise<AttendanceRecord[]> {
    try {
      const data: any = await api.get('/attendance', { params: { limit } });
      return data || [];
    } catch {
      // Fallback mock records
      return [
        {
          id: 'sc-1',
          student_id: '5a530cd1-fa4a-4778-8492-a419f215adf8',
          session_id: '77777777-8888-4444-9999-000000000012',
          location_id: 'f531764d-690b-4d98-a383-57759b24f76c',
          recorded_by: 'f6bcdd54-2705-44fc-b094-e93befc8be4b',
          rfid_tag_id: 'E28011700000020B042F3401',
          type: 'time_in',
          status: 'on_time',
          recorded_at: new Date().toISOString(),
          student: {
            student_id: '2026-00001',
            student_number: '2026-00001',
            name: 'Juan Dela Cruz',
            course: 'BS Information Technology',
            year_level: 3,
          },
          session: {
            name: 'Afternoon Sports Competitions',
          },
          location: {
            name: 'Gymnasium - Gate 1',
          },
        },
      ];
    }
  },

  async recordScan(payload: ScanTelemetryPayload): Promise<AttendanceRecord> {
    const data: any = await api.post('/attendance/scan', payload);
    return data;
  },
};
