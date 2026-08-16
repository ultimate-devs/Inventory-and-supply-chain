import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type { AdminUser, CreateUserPayload, UpdateUserPayload } from '../types/admin';

export const userAdminService = {
  async list(): Promise<AdminUser[]> {
    const { data } = await api.get<ApiEnvelope<AdminUser[]>>('/users', { params: { limit: 100 } });
    return data.data;
  },

  async create(payload: CreateUserPayload): Promise<AdminUser> {
    const { data } = await api.post<ApiEnvelope<AdminUser>>('/users', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateUserPayload): Promise<AdminUser> {
    const { data } = await api.put<ApiEnvelope<AdminUser>>(`/users/${id}`, payload);
    return data.data;
  },

  async deactivate(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async resetPassword(id: string): Promise<void> {
    await api.post(`/users/${id}/reset-password`);
  },
};
