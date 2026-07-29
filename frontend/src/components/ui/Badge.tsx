import type { ReactNode } from 'react';
import type { StockStatus } from '../../types/inventory';

type BadgeTone = 'critical' | 'low' | 'ok' | 'excess' | 'neutral';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  low: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  excess: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const Badge = ({ tone = 'neutral', children }: BadgeProps) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${toneClasses[tone]}`}>
    {children}
  </span>
);

export const stockStatusTone = (status: StockStatus): BadgeTone => status;

export default Badge;
