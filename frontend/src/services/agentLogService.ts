import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type { AgentLog, AgentLogListQuery } from '../types/agentLog';

export const agentLogService = {
  async list(query: AgentLogListQuery = {}): Promise<ApiEnvelope<AgentLog[]>> {
    const { data } = await api.get<ApiEnvelope<AgentLog[]>>('/agent-logs', { params: query });
    return data;
  },
};
