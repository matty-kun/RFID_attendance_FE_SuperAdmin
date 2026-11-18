// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import axios, { AxiosError } from 'axios';
import { authService } from '../src/features/auth/services/authService';
import { useLoginViewModel } from '../src/features/auth/viewmodels/useLoginViewModel';
import { api } from '../src/services/apiClient';

const mockLogin = vi.fn();
vi.mock('../src/features/auth/context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    token: null,
    isLoading: false,
    isAuthenticated: false,
    isSuperAdmin: false,
  }),
}));

vi.mock('../src/services/apiClient', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    api: {
      post: vi.fn(),
      get: vi.fn(),
    },
  };
});

describe('Web Login & Role Check (SA-01)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('authService.login role verification', () => {
    it('blocks student accounts and throws clear access denied message', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        token: 'mock-student-token',
        user: {
          id: 'stu_001',
          name: 'Student Juan',
          role: 'student',
          student_id: '2026-00123',
        },
      });

      await expect(
        authService.login('2026-00123', 'studentPass123')
      ).rejects.toThrow(
        'Access denied: Student accounts cannot access the Super Admin portal. Please use the Presnt mobile app.'
      );

      expect(localStorage.getItem('super_admin_token')).toBeNull();
      expect(localStorage.getItem('super_admin_user')).toBeNull();
    });

    it('blocks regular admin accounts and throws clear access denied message', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        token: 'mock-admin-token',
        user: {
          id: 'adm_001',
          name: 'Marshal Admin',
          role: 'admin',
        },
      });

      await expect(
        authService.login('admin@presnt.edu', 'adminPass123')
      ).rejects.toThrow(
        'Access denied: Admin accounts must use the Presnt mobile app. Only Super Admins can access this portal.'
      );

      expect(localStorage.getItem('super_admin_token')).toBeNull();
      expect(localStorage.getItem('super_admin_user')).toBeNull();
    });

    it('allows super_admin accounts to log in successfully', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        token: 'mock-super-admin-token',
        user: {
          id: 'sa_001',
          name: 'Head Super Admin',
          role: 'super_admin',
        },
      });

      const res = await authService.login('superadmin@presnt.edu', 'superPass123');
      expect(res.token).toBe('mock-super-admin-token');
      expect(res.user.role).toBe('super_admin');
      expect(localStorage.getItem('super_admin_token')).toBe('mock-super-admin-token');
    });
  });

  describe('useLoginViewModel error formatting', () => {
    it('displays student access denied error message instead of network error', async () => {
      mockLogin.mockRejectedValueOnce(
        new Error(
          'Access denied: Student accounts cannot access the Super Admin portal. Please use the Presnt mobile app.'
        )
      );

      const { result } = renderHook(() => useLoginViewModel());

      act(() => {
        result.current.setIdentifier('2026-00123');
        result.current.setPassword('studentPassword');
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.error).toBe(
        'Access denied: Student accounts cannot access the Super Admin portal. Please use the Presnt mobile app.'
      );
      expect(result.current.identifierError).toBe(true);
      expect(result.current.passwordError).toBe(false);
    });

    it('displays admin access denied error message instead of network error', async () => {
      mockLogin.mockRejectedValueOnce(
        new Error(
          'Access denied: Admin accounts must use the Presnt mobile app. Only Super Admins can access this portal.'
        )
      );

      const { result } = renderHook(() => useLoginViewModel());

      act(() => {
        result.current.setIdentifier('admin@presnt.edu');
        result.current.setPassword('adminPassword');
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.error).toBe(
        'Access denied: Admin accounts must use the Presnt mobile app. Only Super Admins can access this portal.'
      );
      expect(result.current.identifierError).toBe(true);
      expect(result.current.passwordError).toBe(false);
    });

    it('correctly handles actual Axios network errors', async () => {
      const axiosNetErr = new AxiosError('Network Error');
      axiosNetErr.code = 'ERR_NETWORK';
      mockLogin.mockRejectedValueOnce(axiosNetErr);

      const { result } = renderHook(() => useLoginViewModel());

      act(() => {
        result.current.setIdentifier('sa@presnt.edu');
        result.current.setPassword('saPassword');
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
      });

      expect(result.current.error).toContain('Network Error');
    });
  });
});
