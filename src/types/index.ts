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
  auth_user_id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar_url?: string | null;
  created_at: string;
}

export interface StudentRecord {
  id: string;
  student_id: string;
  name: string;
  course: string;
  year_level: number;
  rfid_uid: string;
  card_number?: string | null;
  created_at?: string;
}

export interface DashboardMetrics {
  totalEvents: number;
  totalSessions: number;
  totalLocations: number;
  totalAdmins: number;
  totalStudents: number;
  totalScans: number;
  todayTimeIns: number;
  attendanceByDay: Array<{ date: string; timeIns: number; timeOuts: number }>;
  locationActivity: Array<{ id: string; name: string; scansToday: number }>;
}

export type SemesterType = '1st Sem' | '2nd Sem';

export interface AcademicTerm {
  id: string;
  school_year: string;
  semester: SemesterType;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmartBulkSyncItem {
  student_number: string;
  full_name: string;
  course: string;
  year_level: number;
  email?: string | null;
}

export interface SmartBulkSyncSummary {
  total_input: number;
  re_enrolled: number;
  newly_registered: number;
  archived_missing: number;
}

