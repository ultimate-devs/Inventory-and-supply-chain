import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type { AgentRunPayload, AgentRunResult, AgentType } from '../types/agentRun';

export const agentRunService = {
  async run(agentType: AgentType, payload: AgentRunPayload): Promise<AgentRunResult> {
    const { data } = await api.post<ApiEnvelope<AgentRunResult>>(`/agent-runs/${agentType}`, payload);
    return data.data;
  },
};
