import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

function resolveBaseUrl(): string {
  let url = (import.meta.env.VITE_API_URL || '').trim();
  if (!url) {
    return 'http://localhost:3000/api/v1';
  }
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  // If base URL was provided without /api/v1 endpoint suffix, append it
  if (!url.endsWith('/api/v1')) {
    url = `${url}/api/v1`;
  }
  return url;
}

export const API_BASE_URL = resolveBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web',
  },
  timeout: 10000,
});

// Extend internal config for slow-request timers and retry flag
interface TimedRequestConfig extends InternalAxiosRequestConfig {
  _slowTimer?: ReturnType<typeof setTimeout>;
  _retry?: boolean;
}

// Request interceptor: inject token & monitor slow connection
api.interceptors.request.use(
  (config: TimedRequestConfig) => {
    const token = localStorage.getItem('super_admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If request takes longer than 3000ms, alert network monitor of slow connection
    if (typeof window !== 'undefined') {
      config._slowTimer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('presnt:network-slow'));
      }, 3000);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Mutex and queue for concurrent requests during silent refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const triggerSessionExpired = () => {
  if (typeof window === 'undefined') return;
  const currentPath = window.location.pathname + window.location.search;
  if (window.location.pathname !== '/login') {
    sessionStorage.setItem('auth_return_url', currentPath);
    sessionStorage.setItem('session_expired_notice', 'true');

    localStorage.removeItem('super_admin_token');
    localStorage.removeItem('super_admin_refresh_token');
    localStorage.removeItem('super_admin_user');

    window.dispatchEvent(
      new CustomEvent('presnt:session-expired', {
        detail: { returnUrl: currentPath },
      })
    );
  }
};

// Response interceptor to handle unauthorized/forbidden & network state
api.interceptors.response.use(
  (response) => {
    const config = response.config as TimedRequestConfig;
    if (config._slowTimer) {
      clearTimeout(config._slowTimer);
    }
    if (typeof window !== 'undefined' && navigator.onLine) {
      window.dispatchEvent(new CustomEvent('presnt:network-online'));
    }

    // Backend envelopes responses with { success, data }
    return response.data?.data !== undefined ? response.data.data : response.data;
  },
  async (error: AxiosError) => {
    const config = error.config as TimedRequestConfig | undefined;
    if (config?._slowTimer) {
      clearTimeout(config._slowTimer);
    }

    // Detect offline / connection failure
    if (
      typeof window !== 'undefined' &&
      (!navigator.onLine || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || !error.response)
    ) {
      window.dispatchEvent(new CustomEvent('presnt:network-offline'));
    }

    const originalRequest = config;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    // Silent Token Refresh: Intercept 401 and refresh automatically if refresh token exists
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      const storedRefreshToken = localStorage.getItem('super_admin_refresh_token');

      if (!storedRefreshToken) {
        triggerSessionExpired();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken: storedRefreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Type': 'web',
            },
          }
        );

        const data = refreshResponse.data?.data || refreshResponse.data;
        const newAccessToken = data?.token || data?.access_token;
        const newRefreshToken = data?.refreshToken || data?.refresh_token;

        if (!newAccessToken) {
          throw new Error('No access token returned from refresh endpoint.');
        }

        localStorage.setItem('super_admin_token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('super_admin_refresh_token', newRefreshToken);
        }

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        triggerSessionExpired();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401 && (!originalRequest || originalRequest._retry || isAuthEndpoint)) {
      if (!originalRequest?.url?.includes('/auth/login')) {
        triggerSessionExpired();
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
