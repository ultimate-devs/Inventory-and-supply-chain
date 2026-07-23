import type { ReactNode } from 'react';

interface CardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

const Card = ({ icon, title, description }: CardProps) => {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-800">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/10 to-fuchsia-500/10 text-primary-600 transition-colors duration-300 group-hover:from-primary-500/20 group-hover:to-fuchsia-500/20 dark:text-primary-400">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
};

export default Card;
