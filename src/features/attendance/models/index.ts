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
  };
  location?: {
    id?: string;
    name: string;
  };
}

export type AttendanceFilterType = 'all' | 'time_in' | 'time_out';

export interface AttendancePage { records: AttendanceRecord[]; total: number; page: number; limit: number; }

export interface ScanTelemetryPayload {
  session_id: string;
  location_id: string;
  rfid_uid: string;
  type: 'time_in' | 'time_out';
}
