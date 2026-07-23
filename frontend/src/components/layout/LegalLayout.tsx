import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export const LegalSection = ({ heading, children }: { heading: string; children: ReactNode }) => (
  <section>
    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{heading}</h2>
    <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
      {children}
    </div>
  </section>
);

const LegalLayout = ({ title, lastUpdated, children }: LegalLayoutProps) => {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last updated: {lastUpdated}</p>

        <div className="mt-10 space-y-10">{children}</div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalLayout;
