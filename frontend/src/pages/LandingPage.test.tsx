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

  it('renders Login and Sign In buttons', () => {
    renderLandingPage();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /sign in/i }).length).toBeGreaterThan(0);
  });

  it('clicking the hero Sign In button navigates to /login', () => {
    renderLandingPage();
    fireEvent.click(screen.getAllByRole('button', { name: /^sign in$/i })[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('clicking Login navigates to /login', () => {
    renderLandingPage();
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
