import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/reports/stock-turnover', label: 'Stock Turnover' },
  { to: '/reports/stock-status-breakdown', label: 'Stock Status' },
  { to: '/reports/algorithm-comparison', label: 'Algorithm Comparison' },
  { to: '/reports/budget-utilisation', label: 'Budget Utilisation' },
  { to: '/reports/supplier-performance', label: 'Supplier Performance' },
  { to: '/reports/po-pipeline', label: 'PO Pipeline' },
  { to: '/reports/category-spend', label: 'Category Spend' },
];

const ReportNavTabs = () => (
  <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
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

export default ReportNavTabs;
