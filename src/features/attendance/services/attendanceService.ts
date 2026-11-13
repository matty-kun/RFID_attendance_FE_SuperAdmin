import { request } from '../../../services/apiClient';
import type { AttendanceRecord, AttendancePage, AttendanceFilterType, ScanTelemetryPayload } from '../models';

export interface AttendanceQueryOptions {
  page?: number;
  limit?: number;
  type?: AttendanceFilterType;
  startDate?: string;
  endDate?: string;
  sessionId?: string;
  eventId?: string;
}

export const attendanceService = {
  getRecentAttendance: (
    page = 1,
    type: AttendanceFilterType = 'all',
    startDate = '',
    endDate = '',
    limit = 30,
    extra?: { sessionId?: string; eventId?: string }
  ) =>
    request.get<AttendancePage>('/attendance', {
      params: {
        page,
        limit,
        ...(type === 'all' ? {} : { type }),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(extra?.sessionId ? { sessionId: extra.sessionId } : {}),
        ...(extra?.eventId ? { eventId: extra.eventId } : {}),
      },
    }),
  recordScan: (payload: ScanTelemetryPayload) =>
    request.post<AttendanceRecord>('/attendance/scan', payload),
};
