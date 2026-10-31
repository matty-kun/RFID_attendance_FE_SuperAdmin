import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web',
  },
  timeout: 10000,
});

// Request interceptor to inject Super Admin token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('super_admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthorized/forbidden
api.interceptors.response.use(
  (response) => {
    // Backend envelopes responses with { success, data }
    return response.data?.data !== undefined ? response.data.data : response.data;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname + window.location.search;
      if (window.location.pathname !== '/login') {
        sessionStorage.setItem('auth_return_url', currentPath);
        sessionStorage.setItem('session_expired_notice', 'true');

        localStorage.removeItem('super_admin_token');
        localStorage.removeItem('super_admin_user');

        window.dispatchEvent(
          new CustomEvent('presnt:session-expired', {
            detail: { returnUrl: currentPath },
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// The response interceptor unwraps the backend's { success, data } envelope.
export const request = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.get(url, config) as unknown as Promise<T>,
  post: <T>(url: string, data?: unknown): Promise<T> =>
    api.post(url, data) as unknown as Promise<T>,
  patch: <T>(url: string, data?: unknown): Promise<T> =>
    api.patch(url, data) as unknown as Promise<T>,
  put: <T>(url: string, data?: unknown): Promise<T> =>
    api.put(url, data) as unknown as Promise<T>,
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.delete(url, config) as unknown as Promise<T>,
};
