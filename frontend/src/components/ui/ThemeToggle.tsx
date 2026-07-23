import { Sun, Moon } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleTheme } from '../../store/slices/themeSlice';

const ThemeToggle = () => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.theme.mode);

  const handleClick = () => {
    dispatch(toggleTheme());
  };

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={handleClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-all duration-300 hover:scale-105 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {mode === 'dark' ? (
        <Sun className="h-4 w-4 transition-transform duration-300" data-testid="sun-icon" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300" data-testid="moon-icon" />
      )}
    </button>
  );
};

export default ThemeToggle;
