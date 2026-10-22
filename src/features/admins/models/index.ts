export interface AdminRecord {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
  created_at: string;
}

export interface CreateAdminPayload {
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
}
