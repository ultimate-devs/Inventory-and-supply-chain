import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type { DashboardData } from '../types/dashboard';

export const dashboardService = {
  async get(): Promise<DashboardData> {
    const { data } = await api.get<ApiEnvelope<DashboardData>>('/dashboard');
    return data.data;
  },
};
