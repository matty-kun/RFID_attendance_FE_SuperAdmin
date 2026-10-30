import { request } from './apiClient';
import type {
  AttendanceRecord,
  AttendancePage,
  AttendanceFilterType,
  ScanTelemetryPayload,
  AttendanceRosterStatus,
  SessionAttendanceStudent,
  SessionAttendanceSummary,
} from '../features/attendance/models';

export type {
  AttendanceRecord,
  AttendancePage,
  AttendanceFilterType,
  ScanTelemetryPayload,
  AttendanceRosterStatus,
  SessionAttendanceStudent,
  SessionAttendanceSummary,
};

export interface AttendanceQueryOptions {
  page?: number;
  limit?: number;
  type?: AttendanceFilterType;
  startDate?: string;
  endDate?: string;
  sessionId?: string;
  eventId?: string;
}

function normalizeRosterStatus(rawStatus: unknown): AttendanceRosterStatus {
  const normalized = String(rawStatus ?? 'pending').trim().toLowerCase();
  if (normalized === 'present') return 'present';
  if (normalized === 'absent') return 'absent';
  return 'pending';
}

function normalizeStudentRow(item: any, index: number): SessionAttendanceStudent {
  const studentObj = item?.student ?? {};
  const status = normalizeRosterStatus(item?.status ?? item?.attendance_status);
  const studentId = String(
    item?.student_id ??
      item?.student_number ??
      studentObj?.student_id ??
      studentObj?.student_number ??
      item?.id ??
      `student-${index}`
  );
  const id = String(item?.id ?? studentObj?.id ?? studentId);
  const name = String(
    item?.name ?? item?.student_name ?? studentObj?.name ?? studentId
  );

  return {
    id,
    student_id: studentId,
    name,
    course: item?.course ?? studentObj?.course ?? null,
    year_level:
      item?.year_level !== undefined
        ? item.year_level
        : studentObj?.year_level !== undefined
        ? studentObj.year_level
        : null,
    email: item?.email ?? studentObj?.email ?? null,
    rfid_uid: item?.rfid_uid ?? studentObj?.rfid_uid ?? null,
    avatar_url: item?.avatar_url ?? studentObj?.avatar_url ?? null,
    status,
    time_in:
      item?.time_in ??
      item?.time_in_at ??
      item?.check_in_time ??
      item?.recorded_at ??
      null,
    time_out:
      item?.time_out ??
      item?.time_out_at ??
      item?.check_out_time ??
      null,
    time_in_location:
      item?.time_in_location ??
      item?.location_in ??
      item?.location?.name ??
      null,
    time_out_location:
      item?.time_out_location ??
      item?.location_out ??
      null,
  };
}

export function normalizeSessionAttendanceSummary(
  sessionId: string,
  raw: any
): SessionAttendanceSummary {
  const summarySource = raw?.summary ?? raw ?? {};
  const rawRoster = Array.isArray(raw?.roster)
    ? raw.roster
    : Array.isArray(raw?.students)
    ? raw.students
    : Array.isArray(raw?.attendance)
    ? raw.attendance
    : Array.isArray(raw?.records)
    ? raw.records
    : Array.isArray(summarySource?.roster)
    ? summarySource.roster
    : Array.isArray(summarySource?.students)
    ? summarySource.students
    : [];

  const roster: SessionAttendanceStudent[] = rawRoster.map(normalizeStudentRow);

  const countedPresent = roster.filter((s) => s.status === 'present').length;
  const countedAbsent = roster.filter((s) => s.status === 'absent').length;
  const countedPending = roster.filter((s) => s.status === 'pending').length;

  const present = Number(
    raw?.present ??
      raw?.present_count ??
      summarySource?.present ??
      summarySource?.present_count ??
      countedPresent
  );
  const absent = Number(
    raw?.absent ??
      raw?.absent_count ??
      summarySource?.absent ??
      summarySource?.absent_count ??
      countedAbsent
  );
  const pending = Number(
    raw?.pending ??
      raw?.pending_count ??
      summarySource?.pending ??
      summarySource?.pending_count ??
      countedPending
  );
  const total_students = Number(
    raw?.total_students ??
      raw?.total ??
      summarySource?.total_students ??
      summarySource?.total ??
      (roster.length > 0 ? roster.length : present + absent + pending)
  );

  return {
    session_id: String(raw?.session_id ?? raw?.session?.id ?? sessionId),
    session_name: raw?.session_name ?? raw?.session?.name,
    session_status: raw?.session_status ?? raw?.session?.status ?? raw?.status,
    total_students: Number.isFinite(total_students) ? total_students : 0,
    present: Number.isFinite(present) ? present : 0,
    absent: Number.isFinite(absent) ? absent : 0,
    pending: Number.isFinite(pending) ? pending : Math.max(0, total_students - present - absent),
    roster,
    students: roster,
  };
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

  getSessionAttendanceSummary: async (
    sessionId: string
  ): Promise<SessionAttendanceSummary> => {
    const raw = await request.get< unknown >(
      `/sessions/${encodeURIComponent(sessionId)}/attendance/summary`
    );
    return normalizeSessionAttendanceSummary(sessionId, raw);
  },
};

export default attendanceService;
