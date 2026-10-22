export type AdminRole = 'super_admin' | 'admin';

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  auth_user_id?: string;
}

export interface EventRecord {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
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
  created_at?: string;
  updated_at?: string;
}

export interface LocationRecord {
  id: string;
  name: string;
  room_or_floor?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AdminRecord {
  id: string;
  auth_user_id?: string;
  name: string;
  email: string;
  role: AdminRole;
  created_at?: string;
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
  location_id: string;
  recorded_by?: string;
  type: 'time_in' | 'time_out';
  recorded_at: string;
  student?: {
    student_id: string;
    name: string;
    course?: string;
  };
  session?: {
    id: string;
    name: string;
    date?: string;
  };
  location?: {
    id: string;
    name: string;
  };
}

export interface DashboardMetrics {
  totalEvents: number;
  activeSessions: number;
  todayScans: number;
  activeKiosks: number;
  totalStudents: number;
  attendanceRate: number;
}
