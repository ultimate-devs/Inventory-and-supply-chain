import { useEffect } from 'react';
import { Download } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCategorySpend } from '../../store/slices/reportsSlice';
import { reportService } from '../../services/reportService';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import StockBarChart from '../../components/ui/Chart';
import ReportNavTabs from '../../components/reports/ReportNavTabs';
import type { TableColumn } from '../../components/ui/Table';
import type { CategorySpendRow } from '../../types/reports';

const currency = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

const columns: TableColumn<CategorySpendRow>[] = [
  { key: 'category', header: 'Category', render: (row) => row.category ?? '-' },
  { key: 'committedSpend', header: 'Committed Spend', render: (row) => currency(row.committedSpend) },
  { key: 'receivedSpend', header: 'Received Spend', render: (row) => currency(row.receivedSpend) },
  { key: 'lineCount', header: 'PO Lines', render: (row) => row.lineCount },
];

const CategorySpendPage = () => {
  const dispatch = useAppDispatch();
  const { categorySpend, categorySpendStatus } = useAppSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchCategorySpend({}));
  }, [dispatch]);

  const chartData = categorySpend.map((r) => ({
    category: r.category ?? 'Unknown',
    'Committed Spend': r.committedSpend,
    'Received Spend': r.receivedSpend,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Category Spend</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Committed (ordered) vs. actually received spend, by item category.
          </p>
        </div>
        <Button
          variant="ghost"
          className="inline-flex items-center gap-1.5"
          onClick={() => reportService.downloadCategorySpendCsv()}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <ReportNavTabs />

      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No purchase order spend yet.</p>
        ) : (
          <StockBarChart
            data={chartData}
            categoryKey="category"
            series={[
              { key: 'Committed Spend', label: 'Committed Spend', color: '#0d9488' },
              { key: 'Received Spend', label: 'Received Spend', color: '#b45309' },
            ]}
          />
        )}
      </div>

      <Table
        columns={columns}
        rows={categorySpend}
        rowKey={(r) => r.categoryId}
        isLoading={categorySpendStatus === 'loading'}
        emptyMessage="No purchase order spend yet"
      />
    </div>
  );
};

export default CategorySpendPage;
