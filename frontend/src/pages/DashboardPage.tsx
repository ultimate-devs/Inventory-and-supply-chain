import { Link } from 'react-router-dom';
import {
  Package,
  DollarSign,
  AlertTriangle,
  ClipboardList,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import StockBarChart from '../components/ui/Chart';
import type { TableColumn } from '../components/ui/Table';
import type { CriticalItem, ActivityEntry } from '../types/dashboard';

const currency = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const KpiCard = ({
  icon: Icon,
  label,
  value,
  tone = 'primary',
}: {
  icon: typeof Package;
  label: string;
  value: string;
  tone?: 'primary' | 'critical';
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          tone === 'critical'
            ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400'
            : 'bg-gradient-to-br from-primary-500/10 to-fuchsia-500/10 text-primary-600 dark:text-primary-400'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      </div>
    </div>
  </div>
);

const critColumns: TableColumn<CriticalItem>[] = [
  { key: 'name', header: 'Item', render: (row) => row.name },
  { key: 'sku', header: 'SKU', render: (row) => row.sku },
  { key: 'category', header: 'Category', render: (row) => row.category?.name ?? '-' },
  { key: 'stock', header: 'Stock', render: (row) => row.currentStock },
  { key: 'rop', header: 'Reorder Point', render: (row) => Math.round(row.reorderPointProbabilistic) },
  { key: 'status', header: 'Status', render: (row) => <Badge tone="critical">{row.stockStatus}</Badge> },
];

const activityColumns: TableColumn<ActivityEntry>[] = [
  { key: 'action', header: 'Action', render: (row) => row.action },
  { key: 'actor', header: 'By', render: (row) => row.actor?.name ?? 'System' },
  { key: 'when', header: 'When', render: (row) => timeAgo(row.createdAt) },
];

const DashboardPage = () => {
  const { data, isLoading, error, refresh } = useDashboardData();

  if (isLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={refresh} className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const chartData = data.stockVsReorderByCategory.map((c) => ({
    category: c.categoryName,
    'Current Stock': c.totalStock,
    'Reorder Point': Math.round(c.totalReorderPoint),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Live inventory overview, refreshed every 5 minutes.</p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {data.kpis.criticalItemCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {data.kpis.criticalItemCount} item{data.kpis.criticalItemCount === 1 ? '' : 's'} at or below safety
          stock - reorder soon.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Package} label="Total Items" value={data.kpis.totalItems.toLocaleString()} />
        <KpiCard icon={DollarSign} label="Inventory Value" value={currency(data.kpis.totalInventoryValue)} />
        <KpiCard icon={AlertTriangle} label="Critical Items" value={String(data.kpis.criticalItemCount)} tone="critical" />
        <KpiCard icon={ClipboardList} label="Pending Orders" value={String(data.kpis.pendingOrders)} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Stock vs. Reorder Point by Category</h2>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No categories yet.</p>
        ) : (
          <StockBarChart
            data={chartData}
            categoryKey="category"
            series={[
              { key: 'Current Stock', label: 'Current Stock', color: '#6366f1' },
              { key: 'Reorder Point', label: 'Reorder Point', color: '#f59e0b' },
            ]}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Critical Items</h2>
            <Link to="/inventory" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
              View all
            </Link>
          </div>
          <Table columns={critColumns} rows={data.criticalItems} rowKey={(r) => r._id} emptyMessage="No critical items" />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h2>
          <Table columns={activityColumns} rows={data.recentActivity} rowKey={(r) => r._id} emptyMessage="No recent activity" />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
