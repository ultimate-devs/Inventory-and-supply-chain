import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { algorithmService } from '../../services/algorithmService';
import { getApiErrorMessage } from '../../lib/apiClient';
import type { PaginationMeta } from '../../types/api';
import type { AllocationDeltas, AllocationRequestPayload, AllocationResult, CandidateItem, GreedyRun } from '../../types/algorithms';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface AlgorithmsState {
  candidates: CandidateItem[];
  candidatesStatus: AsyncStatus;

  greedyResult: { itemsConsidered: CandidateItem[]; result: AllocationResult } | null;
  greedyStatus: AsyncStatus;
  greedyError: string | null;

  proportionalResult: { itemsConsidered: CandidateItem[]; result: AllocationResult } | null;
  proportionalStatus: AsyncStatus;

  comparison: { run: GreedyRun; deltas: AllocationDeltas } | null;
  comparisonStatus: AsyncStatus;
  comparisonError: string | null;

  runs: GreedyRun[];
  runsMeta: PaginationMeta | null;
  runsStatus: AsyncStatus;

  selectedRun: GreedyRun | null;
  selectedRunStatus: AsyncStatus;
}

const initialState: AlgorithmsState = {
  candidates: [],
  candidatesStatus: 'idle',

  greedyResult: null,
  greedyStatus: 'idle',
  greedyError: null,

  proportionalResult: null,
  proportionalStatus: 'idle',

  comparison: null,
  comparisonStatus: 'idle',
  comparisonError: null,

  runs: [],
  runsMeta: null,
  runsStatus: 'idle',

  selectedRun: null,
  selectedRunStatus: 'idle',
};

export const fetchCandidates = createAsyncThunk('algorithms/fetchCandidates', async (_, { rejectWithValue }) => {
  try {
    return await algorithmService.candidates();
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Unable to load candidate items'));
  }
});

export const runGreedyAllocation = createAsyncThunk(
  'algorithms/runGreedyAllocation',
  async (payload: AllocationRequestPayload, { rejectWithValue }) => {
    try {
      return await algorithmService.runGreedy(payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to run the greedy allocator'));
    }
  },
);

export const runProportionalAllocation = createAsyncThunk(
  'algorithms/runProportionalAllocation',
  async (payload: AllocationRequestPayload, { rejectWithValue }) => {
    try {
      return await algorithmService.runProportional(payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to run the proportional allocator'));
    }
  },
);

export const runComparison = createAsyncThunk(
  'algorithms/runComparison',
  async (payload: AllocationRequestPayload, { rejectWithValue }) => {
    try {
      return await algorithmService.compare(payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to run the algorithm comparison'));
    }
  },
);

export const fetchGreedyRuns = createAsyncThunk(
  'algorithms/fetchGreedyRuns',
  async (query: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      return await algorithmService.listRuns(query);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load run history'));
    }
  },
);

export const fetchGreedyRunById = createAsyncThunk(
  'algorithms/fetchGreedyRunById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await algorithmService.getRun(id);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load run'));
    }
  },
);

const algorithmsSlice = createSlice({
  name: 'algorithms',
  initialState,
  reducers: {
    clearComparison: (state) => {
      state.comparison = null;
      state.comparisonStatus = 'idle';
      state.comparisonError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCandidates.pending, (state) => {
        state.candidatesStatus = 'loading';
      })
      .addCase(fetchCandidates.fulfilled, (state, action) => {
        state.candidatesStatus = 'succeeded';
        state.candidates = action.payload;
      })
      .addCase(fetchCandidates.rejected, (state) => {
        state.candidatesStatus = 'failed';
      })

      .addCase(runGreedyAllocation.pending, (state) => {
        state.greedyStatus = 'loading';
        state.greedyError = null;
      })
      .addCase(runGreedyAllocation.fulfilled, (state, action) => {
        state.greedyStatus = 'succeeded';
        state.greedyResult = action.payload;
      })
      .addCase(runGreedyAllocation.rejected, (state, action) => {
        state.greedyStatus = 'failed';
        state.greedyError = (action.payload as string) ?? 'Unable to run the greedy allocator';
      })

      .addCase(runProportionalAllocation.pending, (state) => {
        state.proportionalStatus = 'loading';
      })
      .addCase(runProportionalAllocation.fulfilled, (state, action) => {
        state.proportionalStatus = 'succeeded';
        state.proportionalResult = action.payload;
      })
      .addCase(runProportionalAllocation.rejected, (state) => {
        state.proportionalStatus = 'failed';
      })

      .addCase(runComparison.pending, (state) => {
        state.comparisonStatus = 'loading';
        state.comparisonError = null;
      })
      .addCase(runComparison.fulfilled, (state, action) => {
        state.comparisonStatus = 'succeeded';
        state.comparison = action.payload;
        state.runs.unshift(action.payload.run);
      })
      .addCase(runComparison.rejected, (state, action) => {
        state.comparisonStatus = 'failed';
        state.comparisonError = (action.payload as string) ?? 'Unable to run the algorithm comparison';
      })

      .addCase(fetchGreedyRuns.pending, (state) => {
        state.runsStatus = 'loading';
      })
      .addCase(fetchGreedyRuns.fulfilled, (state, action) => {
        state.runsStatus = 'succeeded';
        state.runs = action.payload.data;
        state.runsMeta = action.payload.meta ?? null;
      })
      .addCase(fetchGreedyRuns.rejected, (state) => {
        state.runsStatus = 'failed';
      })

      .addCase(fetchGreedyRunById.pending, (state) => {
        state.selectedRunStatus = 'loading';
      })
      .addCase(fetchGreedyRunById.fulfilled, (state, action) => {
        state.selectedRunStatus = 'succeeded';
        state.selectedRun = action.payload;
      })
      .addCase(fetchGreedyRunById.rejected, (state) => {
        state.selectedRunStatus = 'failed';
      });
  },
});

export const { clearComparison } = algorithmsSlice.actions;
export default algorithmsSlice.reducer;
