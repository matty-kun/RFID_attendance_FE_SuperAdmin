export interface AdminRecord {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
  created_at: string;
}

export interface AdminPage { admins: AdminRecord[]; total: number; page: number; limit: number; }

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
