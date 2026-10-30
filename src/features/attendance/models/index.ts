export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  location_id: string;
  recorded_by: string;
  type: 'time_in' | 'time_out';
  recorded_at: string;
  student?: {
    id?: string;
    student_id?: string;
    student_number?: string;
    name: string;
    avatar_url?: string | null;
    course?: string;
    year_level?: number;
  };
  session?: {
    id?: string;
    name: string;
    date?: string;
    event_id?: string;
    time_in_start?: string | null;
  };
  location?: {
    id?: string;
    name: string;
  };
}

export type AttendanceFilterType = 'all' | 'time_in' | 'time_out';

export interface AttendancePage {
  records: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface ScanTelemetryPayload {
  session_id: string;
  location_id: string;
  rfid_uid: string;
  type: 'time_in' | 'time_out';
}

export type AttendanceRosterStatus = 'present' | 'absent' | 'pending';

export interface SessionAttendanceStudent {
  id: string;
  student_id: string;
  name: string;
  course?: string | null;
  year_level?: number | null;
  email?: string | null;
  rfid_uid?: string | null;
  avatar_url?: string | null;
  status: AttendanceRosterStatus;
  time_in?: string | null;
  time_out?: string | null;
  time_in_location?: string | null;
  time_out_location?: string | null;
}

export interface SessionAttendanceSummary {
  session_id: string;
  session_name?: string;
  session_status?: string;
  total_students: number;
  present: number;
  absent: number;
  pending: number;
  roster: SessionAttendanceStudent[];
  students: SessionAttendanceStudent[];
}
