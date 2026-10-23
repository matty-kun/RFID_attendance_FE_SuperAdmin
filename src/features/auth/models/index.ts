export type AdminRole = 'super_admin' | 'admin';

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  must_change_password?: boolean;
  avatar_url?: string;
  created_at?: string;
}

export interface LoginPayload {
  identifier: string;
  password?: string;
}

export interface AuthResponse {
  token: string;
  user: SuperAdminUser;
}
