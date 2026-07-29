import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice';
import authReducer, { setCredentials, clearAuth } from './slices/authSlice';
import inventoryReducer from './slices/inventorySlice';
import { setAuthHandlers } from '../lib/apiClient';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    inventory: inventoryReducer,
  },
});

// Wires the API client's silent-refresh outcome back into Redux, without
// apiClient needing to import the store directly (see lib/apiClient.ts).
setAuthHandlers({
  onRefreshSuccess: (accessToken, user) => store.dispatch(setCredentials({ accessToken, user })),
  onRefreshFailure: () => store.dispatch(clearAuth()),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
