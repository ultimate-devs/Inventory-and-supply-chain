import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/algorithms/greedy', label: 'Run Greedy Allocation' },
  { to: '/algorithms/compare', label: 'Compare vs Proportional' },
  { to: '/algorithms/history', label: 'Run History' },
];

const AlgorithmNavTabs = () => (
  <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
    {TABS.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        className={({ isActive }) =>
          `border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`
        }
      >
        {tab.label}
      </NavLink>
    ))}
  </div>
);

export default AlgorithmNavTabs;
