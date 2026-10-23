import { request } from '../../../services/apiClient';
import type { AttendanceRecord, ScanTelemetryPayload } from '../models';

export const attendanceService = {
  getRecentAttendance: (limit = 30) =>
    request.get<AttendanceRecord[]>('/attendance', { params: { limit } }),
  recordScan: (payload: ScanTelemetryPayload) =>
    request.post<AttendanceRecord>('/attendance/scan', payload),
};
