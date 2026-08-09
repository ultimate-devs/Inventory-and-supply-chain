import { useEffect } from 'react';
import { Download } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchBudgetUtilisation } from '../../store/slices/reportsSlice';
import { reportService } from '../../services/reportService';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { StockLineChart } from '../../components/ui/Chart';
import ReportNavTabs from '../../components/reports/ReportNavTabs';
import type { TableColumn } from '../../components/ui/Table';
import type { BudgetUtilisationPoint } from '../../types/reports';

const pct = (v: number | undefined | null) => (v === undefined || v === null ? '-' : `${v.toFixed(1)}%`);

const columns: TableColumn<BudgetUtilisationPoint>[] = [
  { key: 'date', header: 'Date', render: (row) => new Date(row.createdAt).toLocaleString() },
  { key: 'budget', header: 'Budget', render: (row) => row.budget.toFixed(2) },
  { key: 'greedy', header: 'Greedy %', render: (row) => pct(row.greedyUtilisationPct) },
  { key: 'proportional', header: 'Proportional %', render: (row) => pct(row.proportionalUtilisationPct) },
  { key: 'ilp', header: 'ILP %', render: (row) => pct(row.ilpUtilisationPct) },
];

const BudgetUtilisationPage = () => {
  const dispatch = useAppDispatch();
  const { budgetUtilisation, budgetUtilisationStatus } = useAppSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchBudgetUtilisation({}));
  }, [dispatch]);

  const chartData = budgetUtilisation.map((r) => ({
    date: new Date(r.createdAt).toLocaleDateString(),
    Greedy: r.greedyUtilisationPct,
    Proportional: r.proportionalUtilisationPct,
    ILP: r.ilpUtilisationPct ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Budget Utilisation Over Time</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            What percentage of each allocation run's budget was actually spent.
          </p>
        </div>
        <Button
          variant="ghost"
          className="inline-flex items-center gap-1.5"
          onClick={() => reportService.downloadBudgetUtilisationCsv()}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <ReportNavTabs />

      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No algorithm runs yet.</p>
        ) : (
          <StockLineChart
            data={chartData}
            categoryKey="date"
            series={[
              { key: 'Greedy', label: 'Greedy', color: '#0d9488' },
              { key: 'Proportional', label: 'Proportional', color: '#b45309' },
              { key: 'ILP', label: 'ILP', color: '#334155' },
            ]}
          />
        )}
      </div>

      <Table
        columns={columns}
        rows={budgetUtilisation}
        rowKey={(r) => r.runId}
        isLoading={budgetUtilisationStatus === 'loading'}
        emptyMessage="No algorithm runs yet"
      />
    </div>
  );
};

export default BudgetUtilisationPage;
