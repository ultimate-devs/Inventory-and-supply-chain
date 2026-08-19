import { useEffect } from 'react';
import { Download } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSupplierPerformance } from '../../store/slices/reportsSlice';
import { reportService } from '../../services/reportService';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { SupplierRadarChart } from '../../components/ui/Chart';
import ReportNavTabs from '../../components/reports/ReportNavTabs';
import AgentRunButton from '../../components/agents/AgentRunButton';
import type { TableColumn } from '../../components/ui/Table';
import type { SupplierPerformanceRow } from '../../types/reports';

const RADAR_DIMENSIONS: Array<{ key: keyof SupplierPerformanceRow; label: string }> = [
  { key: 'onTimeRate', label: 'On-Time' },
  { key: 'accuracyRate', label: 'Accuracy' },
  { key: 'leadTimeReliability', label: 'Lead Time' },
  { key: 'priceConsistency', label: 'Price Consistency' },
];

const MAX_RADAR_SUPPLIERS = 5;

const columns: TableColumn<SupplierPerformanceRow>[] = [
  { key: 'name', header: 'Supplier', render: (row) => row.name },
  { key: 'onTimeRate', header: 'On-Time', render: (row) => row.onTimeRate.toFixed(1) },
  { key: 'accuracyRate', header: 'Accuracy', render: (row) => row.accuracyRate.toFixed(1) },
  { key: 'leadTimeReliability', header: 'Lead Time', render: (row) => row.leadTimeReliability.toFixed(1) },
  { key: 'priceConsistency', header: 'Price Consistency', render: (row) => row.priceConsistency.toFixed(1) },
  { key: 'performanceScore', header: 'Overall Score', render: (row) => row.performanceScore.toFixed(1) },
];

const SupplierPerformanceRadarPage = () => {
  const dispatch = useAppDispatch();
  const { supplierPerformance, supplierPerformanceStatus } = useAppSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchSupplierPerformance());
  }, [dispatch]);

  const topSuppliers = supplierPerformance.slice(0, MAX_RADAR_SUPPLIERS);
  const chartData = RADAR_DIMENSIONS.map((dim) => {
    const point: Record<string, string | number> = { dimension: dim.label };
    topSuppliers.forEach((supplier) => {
      point[supplier.name] = supplier[dim.key] as number;
    });
    return point;
  });
  const radarColors = ['#0d9488', '#b45309', '#334155', '#7c3aed', '#dc2626'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Supplier Performance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Approved suppliers scored on delivery, accuracy, lead time, and price - top {MAX_RADAR_SUPPLIERS} charted.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AgentRunButton
            agentType="analytics"
            label="Explain with Analytics Agent"
            modalTitle="Analytics Agent"
            buildPayload={() => ({
              message: 'Explain the current findings in the Supplier Performance report (supplier_performance).',
              action: 'report_review',
            })}
          />
          <Button
            variant="ghost"
            className="inline-flex items-center gap-1.5"
            onClick={() => reportService.downloadSupplierPerformanceCsv()}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <ReportNavTabs />

      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        {topSuppliers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No approved suppliers yet.</p>
        ) : (
          <SupplierRadarChart
            data={chartData}
            angleKey="dimension"
            series={topSuppliers.map((s, i) => ({ key: s.name, label: s.name, color: radarColors[i % radarColors.length] }))}
          />
        )}
      </div>

      <Table
        columns={columns}
        rows={supplierPerformance}
        rowKey={(r) => r.supplierId}
        isLoading={supplierPerformanceStatus === 'loading'}
        emptyMessage="No approved suppliers yet"
      />
    </div>
  );
};

export default SupplierPerformanceRadarPage;
