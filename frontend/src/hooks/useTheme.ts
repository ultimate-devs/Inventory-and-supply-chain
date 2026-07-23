import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme } from '../store/slices/themeSlice';

export const useTheme = () => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.theme.mode);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      dispatch(setTheme(stored));
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      dispatch(setTheme(prefersDark ? 'dark' : 'light'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    localStorage.setItem('theme', mode);
  }, [mode]);

  return { mode };
};
