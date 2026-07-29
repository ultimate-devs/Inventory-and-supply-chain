import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { User } from '../types/auth';
import { API_BASE_URL } from '../config/apiBaseUrl';

export const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

interface AuthHandlers {
  onRefreshSuccess?: (accessToken: string, user: User) => void;
  onRefreshFailure?: () => void;
}

let authHandlers: AuthHandlers = {};

export const setAuthHandlers = (handlers: AuthHandlers) => {
  authHandlers = handlers;
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || isRefreshCall) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      const { data } = await api.post('/auth/refresh');
      const { accessToken: newToken, user } = data.data;
      setAccessToken(newToken);
      authHandlers.onRefreshSuccess?.(newToken, user);
      originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
      return api(originalRequest);
    } catch (refreshError) {
      setAccessToken(null);
      authHandlers.onRefreshFailure?.();
      return Promise.reject(refreshError);
    }
  },
);

export const getApiErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message || fallback;
  }
  return fallback;
};
