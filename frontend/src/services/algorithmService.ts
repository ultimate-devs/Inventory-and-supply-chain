import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type { AllocationDeltas, AllocationRequestPayload, AllocationResult, CandidateItem, GreedyRun } from '../types/algorithms';

export const algorithmService = {
  async candidates(): Promise<CandidateItem[]> {
    const { data } = await api.get<ApiEnvelope<CandidateItem[]>>('/algorithms/candidates');
    return data.data;
  },

  async runGreedy(payload: AllocationRequestPayload): Promise<{ itemsConsidered: CandidateItem[]; result: AllocationResult }> {
    const { data } = await api.post<ApiEnvelope<{ itemsConsidered: CandidateItem[]; result: AllocationResult }>>(
      '/algorithms/greedy-allocation',
      payload,
    );
    return data.data;
  },

  async runProportional(
    payload: AllocationRequestPayload,
  ): Promise<{ itemsConsidered: CandidateItem[]; result: AllocationResult }> {
    const { data } = await api.post<ApiEnvelope<{ itemsConsidered: CandidateItem[]; result: AllocationResult }>>(
      '/algorithms/proportional-allocation',
      payload,
    );
    return data.data;
  },

  async compare(payload: AllocationRequestPayload): Promise<{ run: GreedyRun; deltas: AllocationDeltas }> {
    const { data } = await api.post<ApiEnvelope<{ run: GreedyRun; deltas: AllocationDeltas }>>(
      '/algorithms/compare',
      payload,
    );
    return data.data;
  },

  async listRuns(query: { page?: number; limit?: number } = {}): Promise<ApiEnvelope<GreedyRun[]>> {
    const { data } = await api.get<ApiEnvelope<GreedyRun[]>>('/algorithms/runs', { params: query });
    return data;
  },

  async getRun(id: string): Promise<GreedyRun> {
    const { data } = await api.get<ApiEnvelope<GreedyRun>>(`/algorithms/runs/${id}`);
    return data.data;
  },
};
