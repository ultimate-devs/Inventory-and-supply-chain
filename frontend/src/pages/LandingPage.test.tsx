import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import themeReducer from '../store/slices/themeSlice';
import LandingPage from './LandingPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLandingPage = () => {
  const store = configureStore({ reducer: { theme: themeReducer } });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </Provider>,
  );
};

describe('LandingPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders Login and Sign Up buttons', () => {
    renderLandingPage();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /sign up|get started/i }).length).toBeGreaterThan(
      0,
    );
  });

  it('clicking Sign Up navigates to /signup', () => {
    renderLandingPage();
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('clicking Login navigates to /login', () => {
    renderLandingPage();
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
