export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  location_id: string;
  recorded_by: string;
  type: 'time_in' | 'time_out';
  status: 'on_time' | 'late' | 'invalid_location' | 'duplicate';
  recorded_at: string;
  scanned_at?: string;
  rfid_tag_id?: string;
  student?: {
    id?: string;
    student_id?: string;
    student_number?: string;
    name: string;
    course?: string;
    year_level?: number;
  };
  session?: {
    id?: string;
    name: string;
    date?: string;
  };
  location?: {
    id?: string;
    name: string;
  };
}

export type AttendanceFilterType = 'all' | 'time_in' | 'time_out';

export interface ScanTelemetryPayload {
  session_id: string;
  location_id: string;
  rfid_uid: string;
  type: 'time_in' | 'time_out';
}
