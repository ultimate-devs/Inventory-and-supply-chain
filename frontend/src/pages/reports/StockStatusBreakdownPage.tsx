import { useEffect } from 'react';
import { Download } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStockStatusBreakdown } from '../../store/slices/reportsSlice';
import { reportService } from '../../services/reportService';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import StockBarChart from '../../components/ui/Chart';
import ReportNavTabs from '../../components/reports/ReportNavTabs';
import type { TableColumn } from '../../components/ui/Table';
import type { StockStatusByCategory } from '../../types/reports';

const columns: TableColumn<StockStatusByCategory & { key: string }>[] = [
  { key: 'category', header: 'Category', render: (row) => row.category },
  { key: 'stockStatus', header: 'Status', render: (row) => row.stockStatus },
  { key: 'count', header: 'Items', render: (row) => row.count },
];

const StockStatusBreakdownPage = () => {
  const dispatch = useAppDispatch();
  const { stockStatusBreakdown, stockStatusBreakdownStatus } = useAppSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchStockStatusBreakdown());
  }, [dispatch]);

  const chartData = (stockStatusBreakdown?.byStatus ?? []).map((s) => ({ status: s.stockStatus, Items: s.count }));
  const rows = (stockStatusBreakdown?.byCategory ?? []).map((r, i) => ({ ...r, key: `${r.category}-${r.stockStatus}-${i}` }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Stock Status Breakdown</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            How many items are Critical, Low, OK, or Excess - overall and by category.
          </p>
        </div>
        <Button
          variant="ghost"
          className="inline-flex items-center gap-1.5"
          onClick={() => reportService.downloadStockStatusBreakdownCsv()}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <ReportNavTabs />

      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Items by Status</h2>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No items yet.</p>
        ) : (
          <StockBarChart data={chartData} categoryKey="status" series={[{ key: 'Items', label: 'Items', color: '#0d9488' }]} />
        )}
      </div>

      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.key}
        isLoading={stockStatusBreakdownStatus === 'loading'}
        emptyMessage="No items yet"
      />
    </div>
  );
};

export default StockStatusBreakdownPage;
