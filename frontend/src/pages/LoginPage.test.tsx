import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import themeReducer from '../store/slices/themeSlice';
import { authService } from '../services/authService';
import LoginPage from './LoginPage';

jest.mock('../services/authService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderLoginPage = () => {
  const store = configureStore({ reducer: { auth: authReducer, theme: themeReducer } });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </Provider>,
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    jest.clearAllMocks();
  });

  it('shows validation errors when submitted empty', () => {
    renderLoginPage();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  it('navigates to the dashboard on a successful login', async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      user: { id: '1', name: 'Ada', email: 'ada@example.com', role: 'analyst', isActive: true, mustChangePassword: false },
      accessToken: 'token-123',
    });

    renderLoginPage();
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Sup3rSecret!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows an error message when the credentials are rejected', async () => {
    (authService.login as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Invalid email or password' } },
    });

    renderLoginPage();
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'WrongPass1' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
