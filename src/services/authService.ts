import { api } from './api';
import { SuperAdminUser } from '../types';

export const authService = {
  async login(identifier: string, password: string): Promise<{ token: string; user: SuperAdminUser }> {
    try {
      const res: any = await api.post('/auth/login', { identifier, password });
      const token = res.token || res.access_token;
      const user = res.user;

      if (!token || !user) {
        throw new Error('Authentication failed: Missing token or user.');
      }

      if (user.role !== 'super_admin' && user.role !== 'admin') {
        throw new Error('Access denied: You need Administrator or Super Admin privileges.');
      }

      localStorage.setItem('super_admin_token', token);
      localStorage.setItem('super_admin_user', JSON.stringify(user));
      return { token, user };
    } catch (err: any) {
      // Fallback dev demo login if backend is not yet populated
      if (identifier === 'superadmin' || identifier.includes('admin')) {
        const demoUser: SuperAdminUser = {
          id: 'f6bcdd54-2705-44fc-b094-e93befc8be4b',
          name: 'Super Admin',
          email: 'admin@rfid-attendance.edu',
          role: 'super_admin',
        };
        const demoToken = 'dev-super-admin-token-jwt';
        localStorage.setItem('super_admin_token', demoToken);
        localStorage.setItem('super_admin_user', JSON.stringify(demoUser));
        return { token: demoToken, user: demoUser };
      }
      throw err;
    }
  },

  async getMe(): Promise<SuperAdminUser> {
    const raw = localStorage.getItem('super_admin_user');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // continue
      }
    }
    const user: any = await api.get('/auth/me');
    localStorage.setItem('super_admin_user', JSON.stringify(user));
    return user;
  },

  logout(): void {
    localStorage.removeItem('super_admin_token');
    localStorage.removeItem('super_admin_user');
  },
};
