import { api } from '../../../services/apiClient';
import { SuperAdminUser, AuthResponse } from '../models';

export const authService = {
  async login(identifier: string, password: string): Promise<AuthResponse> {
      const res: any = await api.post('/auth/login', { identifier, password });
      const token = res.token || res.access_token;
      const user = res.user;

      if (!token || !user) {
        throw new Error('Authentication failed: Missing token or user.');
      }

      if (user.role !== 'super_admin') {
        throw new Error('Access denied: Super Admin privileges are required.');
      }

      localStorage.setItem('super_admin_token', token);
      localStorage.setItem('super_admin_user', JSON.stringify(user));
      return { token, user };
  },

  async getMe(): Promise<SuperAdminUser> {
    const user: SuperAdminUser = await api.get('/auth/me');
    if (user.role !== 'super_admin') {
      throw new Error('Access denied: Super Admin privileges are required.');
    }
    localStorage.setItem('super_admin_user', JSON.stringify(user));
    return user;
  },

  logout(): void {
    localStorage.removeItem('super_admin_token');
    localStorage.removeItem('super_admin_user');
  },
};
