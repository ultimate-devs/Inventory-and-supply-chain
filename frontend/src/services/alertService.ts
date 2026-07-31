import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type { Alert, AlertListQuery } from '../types/alert';

export const alertService = {
  async list(query: AlertListQuery = {}): Promise<ApiEnvelope<Alert[]>> {
    const { data } = await api.get<ApiEnvelope<Alert[]>>('/alerts', { params: query });
    return data;
  },

  async unreadCount(): Promise<number> {
    const { data } = await api.get<ApiEnvelope<{ count: number }>>('/alerts/unread-count');
    return data.data.count;
  },

  async acknowledge(id: string): Promise<Alert> {
    const { data } = await api.post<ApiEnvelope<Alert>>(`/alerts/${id}/acknowledge`);
    return data.data;
  },

  async resolve(id: string): Promise<Alert> {
    const { data } = await api.post<ApiEnvelope<Alert>>(`/alerts/${id}/resolve`);
    return data.data;
  },
};
