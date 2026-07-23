import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import themeReducer from '../../store/slices/themeSlice';
import ThemeToggle from './ThemeToggle';

const renderWithStore = (mode: 'light' | 'dark') => {
  const store = configureStore({
    reducer: { theme: themeReducer },
    preloadedState: { theme: { mode } },
  });
  render(
    <Provider store={store}>
      <ThemeToggle />
    </Provider>,
  );
  return store;
};

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders sun icon when theme is dark', () => {
    renderWithStore('dark');
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument();
  });

  it('renders moon icon when theme is light', () => {
    renderWithStore('light');
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument();
  });

  it('dispatches toggleTheme action on click', () => {
    const store = renderWithStore('light');
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    expect(store.getState().theme.mode).toBe('dark');
  });

  it('persists theme choice to localStorage', () => {
    renderWithStore('light');
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
