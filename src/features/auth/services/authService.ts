import axios from 'axios';
import { api, API_BASE_URL } from '../../../services/apiClient';
import { SuperAdminUser, AuthResponse } from '../models';

export const authService = {
  async login(identifier: string, password: string): Promise<AuthResponse> {
    const res: any = await api.post('/auth/login', { identifier, password });
    const token = res.token || res.access_token;
    const refreshToken = res.refreshToken || res.refresh_token;
    const user = res.user;

    if (!token || !user) {
      throw new Error('Authentication failed: Missing token or user.');
    }

    if (user.role !== 'super_admin') {
      localStorage.removeItem('super_admin_token');
      localStorage.removeItem('super_admin_refresh_token');
      localStorage.removeItem('super_admin_user');
      throw new Error('Access denied: Super Admin privileges are required.');
    }

    localStorage.setItem('super_admin_token', token);
    if (refreshToken) {
      localStorage.setItem('super_admin_refresh_token', refreshToken);
    }
    localStorage.setItem('super_admin_user', JSON.stringify(user));
    return { token, refreshToken, user };
  },

  async refreshToken(): Promise<string | null> {
    const storedRefreshToken = localStorage.getItem('super_admin_refresh_token');
    if (!storedRefreshToken) return null;

    try {
      const res = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken: storedRefreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Type': 'web',
          },
        }
      );
      const data = res.data?.data || res.data;
      const newToken = data?.token || data?.access_token;
      const newRefreshToken = data?.refreshToken || data?.refresh_token;

      if (newToken) {
        localStorage.setItem('super_admin_token', newToken);
        if (newRefreshToken) {
          localStorage.setItem('super_admin_refresh_token', newRefreshToken);
        }
        return newToken;
      }
    } catch {
      return null;
    }
    return null;
  },

  async getMe(): Promise<SuperAdminUser> {
    const user: SuperAdminUser = await api.get('/auth/me');
    if (user.role !== 'super_admin') {
      localStorage.removeItem('super_admin_token');
      localStorage.removeItem('super_admin_refresh_token');
      localStorage.removeItem('super_admin_user');
      throw new Error('Access denied: Super Admin privileges are required.');
    }
    localStorage.setItem('super_admin_user', JSON.stringify(user));
    return user;
  },

  logout(): void {
    const hasToken = Boolean(localStorage.getItem('super_admin_token'));
    if (hasToken) {
      api.post('/auth/logout').catch(() => {});
    }
    localStorage.removeItem('super_admin_token');
    localStorage.removeItem('super_admin_refresh_token');
    localStorage.removeItem('super_admin_user');
  },
};
