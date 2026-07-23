import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Boxes } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const AuthLayout = ({ title, subtitle, children }: AuthLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-400/20 blur-3xl dark:bg-primary-500/10" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl dark:bg-fuchsia-500/10" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-fuchsia-600 text-white">
            <Boxes className="h-4 w-4" />
          </span>
          SupplyChain Pro
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to home</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 sm:p-10">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-200 px-6 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        &copy; {new Date().getFullYear()} SupplyChain Pro. All rights reserved.
      </footer>
    </div>
  );
};

export default AuthLayout;
