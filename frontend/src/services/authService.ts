import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

export const authService = {
  async register(payload: RegisterPayload): Promise<User> {
    const { data } = await api.post<ApiEnvelope<User>>('/auth/register', payload);
    return data.data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<ApiEnvelope<AuthResponse>>('/auth/login', payload);
    return data.data;
  },

  async refresh(): Promise<AuthResponse> {
    const { data } = await api.post<ApiEnvelope<AuthResponse>>('/auth/refresh');
    return data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async me(): Promise<User> {
    const { data } = await api.get<ApiEnvelope<User>>('/auth/me');
    return data.data;
  },
};
