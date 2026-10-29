export interface AdminRecord {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
  avatar_url?: string | null;
  archived_at?: string | null;
  created_at: string;
}

export interface AdminPage { admins: AdminRecord[]; total: number; page: number; limit: number; }

export interface AdminCheckpointActivityRecord {
  id: string;
  type: 'time_in' | 'time_out';
  recorded_at: string;
  student_name: string;
  session_name: string;
  session_date: string | null;
  event_name: string;
  location_name: string;
}

export interface AdminCheckpointActivityPage {
  records: AdminCheckpointActivityRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateAdminPayload {
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
  temporary_password: string;
}

export interface UpdateAdminPayload {
  name?: string;
  role?: 'super_admin' | 'admin';
  password?: string;
}
