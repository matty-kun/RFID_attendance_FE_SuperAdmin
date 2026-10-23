import { request } from '../../../services/apiClient';
import type { AttendanceRecord, AttendancePage, AttendanceFilterType, ScanTelemetryPayload } from '../models';

export const attendanceService = {
  getRecentAttendance: (page = 1, type: AttendanceFilterType = 'all', startDate = '', endDate = '') =>
    request.get<AttendancePage>('/attendance', { params: {
      page, limit: 30,
      ...(type === 'all' ? {} : { type }),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    } }),
  recordScan: (payload: ScanTelemetryPayload) =>
    request.post<AttendanceRecord>('/attendance/scan', payload),
};
