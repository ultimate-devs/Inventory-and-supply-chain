import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type { SystemSettings, UpdateSystemSettingsPayload } from '../types/admin';

export const settingsService = {
  async get(): Promise<SystemSettings> {
    const { data } = await api.get<ApiEnvelope<SystemSettings>>('/settings');
    return data.data;
  },

  async update(payload: UpdateSystemSettingsPayload): Promise<SystemSettings> {
    const { data } = await api.put<ApiEnvelope<SystemSettings>>('/settings', payload);
    return data.data;
  },
};
