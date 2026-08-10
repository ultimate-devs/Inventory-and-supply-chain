import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { agentLogService } from '../../services/agentLogService';
import { getApiErrorMessage } from '../../lib/apiClient';
import type { PaginationMeta } from '../../types/api';
import type { AgentLog, AgentLogListQuery } from '../../types/agentLog';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface AgentLogsState {
  logs: AgentLog[];
  meta: PaginationMeta | null;
  status: AsyncStatus;
  error: string | null;
}

const initialState: AgentLogsState = {
  logs: [],
  meta: null,
  status: 'idle',
  error: null,
};

export const fetchAgentLogs = createAsyncThunk(
  'agentLogs/fetchAgentLogs',
  async (query: AgentLogListQuery = {}, { rejectWithValue }) => {
    try {
      return await agentLogService.list(query);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load agent insights'));
    }
  },
);

const agentLogsSlice = createSlice({
  name: 'agentLogs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgentLogs.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAgentLogs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.logs = action.payload.data;
        state.meta = action.payload.meta ?? null;
      })
      .addCase(fetchAgentLogs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Unable to load agent insights';
      });
  },
});

export default agentLogsSlice.reducer;
