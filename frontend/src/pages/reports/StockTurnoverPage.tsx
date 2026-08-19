import { useEffect } from 'react';
import { Download } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStockTurnover } from '../../store/slices/reportsSlice';
import { reportService } from '../../services/reportService';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import ReportNavTabs from '../../components/reports/ReportNavTabs';
import AgentRunButton from '../../components/agents/AgentRunButton';
import type { TableColumn } from '../../components/ui/Table';
import type { StockTurnoverRow } from '../../types/reports';

const columns: TableColumn<StockTurnoverRow>[] = [
  { key: 'sku', header: 'SKU', render: (row) => row.sku },
  { key: 'name', header: 'Item', render: (row) => row.name },
  { key: 'category', header: 'Category', render: (row) => row.category ?? '-' },
  { key: 'annualDemand', header: 'Annual Demand', render: (row) => row.annualDemand.toLocaleString() },
  { key: 'avgStock', header: 'Avg Stock', render: (row) => row.avgStock.toLocaleString() },
  { key: 'turnoverRatio', header: 'Turnover Ratio', render: (row) => row.turnoverRatio.toFixed(2) },
];

const StockTurnoverPage = () => {
  const dispatch = useAppDispatch();
  const { stockTurnover, stockTurnoverStatus, stockTurnoverError } = useAppSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchStockTurnover({}));
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Stock Turnover</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Annual demand vs. average stock (trailing 90 days), per item - higher is faster-moving.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AgentRunButton
            agentType="analytics"
            label="Explain with Analytics Agent"
            modalTitle="Analytics Agent"
            buildPayload={() => ({
              message: 'Explain the current findings in the Stock Turnover report (stock_turnover).',
              action: 'report_review',
            })}
          />
          <Button
            variant="ghost"
            className="inline-flex items-center gap-1.5"
            onClick={() => reportService.downloadStockTurnoverCsv()}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <ReportNavTabs />

      {stockTurnoverError && <p className="text-sm text-red-500">{stockTurnoverError}</p>}

      <Table
        columns={columns}
        rows={stockTurnover}
        rowKey={(r) => r.itemId}
        isLoading={stockTurnoverStatus === 'loading'}
        emptyMessage="No items yet"
      />
    </div>
  );
};

export default StockTurnoverPage;
