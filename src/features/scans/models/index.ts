export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  location_id?: string;
  rfid_tag_id: string;
  type: 'time_in' | 'time_out';
  status: 'on_time' | 'late' | 'invalid_location' | 'duplicate';
  scanned_at: string;
  student?: {
    name: string;
    student_number: string;
    course_year?: string;
  };
  session?: {
    name: string;
  };
  location?: {
    name: string;
  };
}

export type ScanFilterType = 'all' | 'time_in' | 'time_out';
