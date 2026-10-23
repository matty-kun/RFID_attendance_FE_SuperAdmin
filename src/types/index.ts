export type AdminRole = 'super_admin' | 'admin';

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  auth_user_id?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface EventRecord {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SessionRecord {
  id: string;
  event_id: string;
  name: string;
  date: string;
  time_in_start: string;
  time_in_end: string;
  time_out_start: string;
  time_out_end: string;
  status?: 'upcoming' | 'open' | 'closed';
  event?: {
    name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface LocationRecord {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface AdminRecord {
  id: string;
  auth_user_id?: string;
  name: string;
  email: string;
  role: AdminRole;
  created_at: string;
}

export interface StudentRecord {
  id: string;
  student_id: string;
  name: string;
  course: string;
  year_level: number;
  rfid_uid: string;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  location_id?: string;
  rfid_tag_id: string;
  type: 'time_in' | 'time_out';
  status: 'on_time' | 'late' | 'invalid_location' | 'duplicate';
  scanned_at: string;
  recorded_by?: string;
  recorded_at?: string;
  student?: {
    student_id?: string;
    student_number?: string;
    name: string;
    course?: string;
    course_year?: string;
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

export interface DashboardMetrics {
  totalEvents: number;
  activeSessions: number;
  totalLocations?: number;
  totalAdmins?: number;
  totalScansToday?: number;
  todayScans?: number;
  activeKiosks: number;
  totalStudents?: number;
  attendanceRate?: number;
}
