import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type {
  AuthResponse,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  ResetPasswordPayload,
  User,
} from '../types/auth';

export const authService = {
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

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await api.post('/auth/forgot-password', payload);
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await api.post('/auth/reset-password', payload);
  },

  async changePassword(payload: ChangePasswordPayload): Promise<User> {
    const { data } = await api.post<ApiEnvelope<User>>('/auth/change-password', payload);
    return data.data;
  },
};
