import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';
import { getApiErrorMessage, setAccessToken } from '../../lib/apiClient';
import type { AuthResponse, ChangePasswordPayload, LoginPayload, User } from '../../types/auth';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: 'idle',
  error: null,
};

// Attempts a silent refresh on app load, using the httpOnly refresh cookie -
// this is how a page reload keeps the session alive without storing the
// access token anywhere persistent.
export const bootstrapAuth = createAsyncThunk<AuthResponse, void, { rejectValue: null }>(
  'auth/bootstrap',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.refresh();
    } catch {
      return rejectWithValue(null);
    }
  },
);

export const login = createAsyncThunk<AuthResponse, LoginPayload, { rejectValue: string }>(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    try {
      return await authService.login(payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to sign in'));
    }
  },
);

export const changePassword = createAsyncThunk<User, ChangePasswordPayload, { rejectValue: string }>(
  'auth/changePassword',
  async (payload, { rejectWithValue }) => {
    try {
      return await authService.changePassword(payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to change password'));
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authService.logout();
  } catch {
    // Even if the network call fails, we still clear local session state.
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthResponse>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = 'authenticated';
      setAccessToken(action.payload.accessToken);
    },
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.status = 'unauthenticated';
      setAccessToken(null);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.status = 'authenticated';
        setAccessToken(action.payload.accessToken);
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = 'unauthenticated';
      })
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.status = 'authenticated';
        setAccessToken(action.payload.accessToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'unauthenticated';
        state.error = action.payload ?? 'Unable to sign in';
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = 'unauthenticated';
        setAccessToken(null);
      });
  },
});

export const { setCredentials, clearAuth } = authSlice.actions;
export default authSlice.reducer;
