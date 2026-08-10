import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { alertService } from '../../services/alertService';
import { getApiErrorMessage } from '../../lib/apiClient';
import type { Alert, AlertListQuery } from '../../types/alert';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface AlertsState {
  alerts: Alert[];
  alertsStatus: AsyncStatus;
  alertsError: string | null;
  unreadCount: number;
}

const initialState: AlertsState = {
  alerts: [],
  alertsStatus: 'idle',
  alertsError: null,
  unreadCount: 0,
};

export const fetchAlerts = createAsyncThunk(
  'alerts/fetchAlerts',
  async (query: AlertListQuery = {}, { rejectWithValue }) => {
    try {
      return await alertService.list(query);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load alerts'));
    }
  },
);

export const fetchUnreadCount = createAsyncThunk('alerts/fetchUnreadCount', async (_, { rejectWithValue }) => {
  try {
    return await alertService.unreadCount();
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Unable to load unread alert count'));
  }
});

export const acknowledgeAlert = createAsyncThunk(
  'alerts/acknowledgeAlert',
  async (id: string, { rejectWithValue }) => {
    try {
      return await alertService.acknowledge(id);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to acknowledge alert'));
    }
  },
);

export const resolveAlert = createAsyncThunk('alerts/resolveAlert', async (id: string, { rejectWithValue }) => {
  try {
    return await alertService.resolve(id);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Unable to resolve alert'));
  }
});

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlerts.pending, (state) => {
        state.alertsStatus = 'loading';
        state.alertsError = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.alertsStatus = 'succeeded';
        state.alerts = action.payload.data;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.alertsStatus = 'failed';
        state.alertsError = (action.payload as string) ?? 'Unable to load alerts';
      })

      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      });

    [acknowledgeAlert, resolveAlert].forEach((thunk) => {
      builder.addCase(thunk.fulfilled, (state, action) => {
        const idx = state.alerts.findIndex((a) => a._id === action.payload._id);
        if (idx !== -1) state.alerts[idx] = action.payload;
        state.unreadCount = state.alerts.filter((a) => a.status === 'open').length;
      });
    });
  },
});

export default alertsSlice.reducer;
