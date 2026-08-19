import { useEffect } from 'react';
import { Download } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAlgorithmComparisonReport } from '../../store/slices/reportsSlice';
import { reportService } from '../../services/reportService';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import ReportNavTabs from '../../components/reports/ReportNavTabs';
import AgentRunButton from '../../components/agents/AgentRunButton';
import type { TableColumn } from '../../components/ui/Table';
import type { AlgorithmComparisonRow } from '../../types/reports';

const pct = (v: number | undefined | null) => (v === undefined || v === null ? '-' : `${v.toFixed(1)}%`);

const columns: TableColumn<AlgorithmComparisonRow>[] = [
  { key: 'date', header: 'Date', render: (row) => new Date(row.createdAt).toLocaleString() },
  { key: 'budget', header: 'Budget', render: (row) => row.budget.toFixed(2) },
  { key: 'runBy', header: 'Run By', render: (row) => row.runBy ?? '-' },
  { key: 'greedy', header: 'Greedy Utilisation', render: (row) => pct(row.greedy.budgetUtilisationPct) },
  { key: 'proportional', header: 'Proportional Utilisation', render: (row) => pct(row.proportional.budgetUtilisationPct) },
  { key: 'ilp', header: 'ILP Utilisation', render: (row) => pct(row.ilp?.budgetUtilisationPct) },
];

const AlgorithmComparisonReportPage = () => {
  const dispatch = useAppDispatch();
  const { algorithmComparison, algorithmComparisonStatus } = useAppSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchAlgorithmComparisonReport({ limit: 20 }));
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Algorithm Comparison</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Greedy, Proportional, and ILP allocation runs, side by side - most recent 20.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AgentRunButton
            agentType="analytics"
            label="Explain with Analytics Agent"
            modalTitle="Analytics Agent"
            buildPayload={() => ({
              message: 'Explain the current findings in the Algorithm Comparison report (algorithm_comparison).',
              action: 'report_review',
            })}
          />
          <Button
            variant="ghost"
            className="inline-flex items-center gap-1.5"
            onClick={() => reportService.downloadAlgorithmComparisonCsv()}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <ReportNavTabs />

      <Table
        columns={columns}
        rows={algorithmComparison}
        rowKey={(r) => r.runId}
        isLoading={algorithmComparisonStatus === 'loading'}
        emptyMessage="No algorithm runs yet - try the Greedy Allocation page"
      />
    </div>
  );
};

export default AlgorithmComparisonReportPage;
