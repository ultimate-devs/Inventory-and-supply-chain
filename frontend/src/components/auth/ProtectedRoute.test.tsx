import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import type { AuthState } from '../../store/slices/authSlice';
import ProtectedRoute from './ProtectedRoute';

const renderWithAuthState = (authState: Partial<AuthState>, initialEntries = ['/dashboard']) => {
  const preloadedAuth: AuthState = { user: null, accessToken: null, status: 'idle', error: null, ...authState };
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: preloadedAuth },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard Content</div>} />
            <Route path="/change-password" element={<div>Change Password Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

describe('ProtectedRoute', () => {
  it('redirects to /login when unauthenticated', () => {
    renderWithAuthState({ status: 'unauthenticated' });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('renders the protected content when authenticated', () => {
    renderWithAuthState({
      status: 'authenticated',
      user: { id: '1', name: 'Ada', email: 'ada@example.com', role: 'analyst', isActive: true, mustChangePassword: false },
    });
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('shows a loading state while the session is still being resolved', () => {
    renderWithAuthState({ status: 'loading' });
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to /change-password when the user must change their password', () => {
    renderWithAuthState({
      status: 'authenticated',
      user: { id: '1', name: 'Ada', email: 'ada@example.com', role: 'analyst', isActive: true, mustChangePassword: true },
    });
    expect(screen.getByText('Change Password Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('redirects away from /change-password once the password has already been changed', () => {
    renderWithAuthState(
      {
        status: 'authenticated',
        user: { id: '1', name: 'Ada', email: 'ada@example.com', role: 'analyst', isActive: true, mustChangePassword: false },
      },
      ['/change-password'],
    );
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });
});
