import { useEffect } from 'react';
import { Download } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchPurchaseOrderPipeline } from '../../store/slices/reportsSlice';
import { reportService } from '../../services/reportService';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import StockBarChart from '../../components/ui/Chart';
import ReportNavTabs from '../../components/reports/ReportNavTabs';
import type { TableColumn } from '../../components/ui/Table';
import type { PoLeadTimeBySupplier } from '../../types/reports';

const columns: TableColumn<PoLeadTimeBySupplier>[] = [
  { key: 'supplierName', header: 'Supplier', render: (row) => row.supplierName },
  { key: 'avgLeadTimeDays', header: 'Avg Lead Time (days)', render: (row) => row.avgLeadTimeDays.toFixed(1) },
  { key: 'minLeadTimeDays', header: 'Min', render: (row) => row.minLeadTimeDays.toFixed(1) },
  { key: 'maxLeadTimeDays', header: 'Max', render: (row) => row.maxLeadTimeDays.toFixed(1) },
  { key: 'receivedCount', header: 'Received Orders', render: (row) => row.receivedCount },
];

const PurchaseOrderPipelinePage = () => {
  const dispatch = useAppDispatch();
  const { purchaseOrderPipeline, purchaseOrderPipelineStatus } = useAppSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchPurchaseOrderPipeline());
  }, [dispatch]);

  const chartData = (purchaseOrderPipeline?.pipeline ?? []).map((p) => ({
    status: p.status.replace(/_/g, ' '),
    Orders: p.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Purchase Order Pipeline</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Orders by status, and how long received orders actually took to arrive per supplier.
          </p>
        </div>
        <Button
          variant="ghost"
          className="inline-flex items-center gap-1.5"
          onClick={() => reportService.downloadPurchaseOrderPipelineCsv()}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <ReportNavTabs />

      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Orders by Status</h2>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No purchase orders yet.</p>
        ) : (
          <StockBarChart data={chartData} categoryKey="status" series={[{ key: 'Orders', label: 'Orders', color: '#0d9488' }]} />
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Lead Time by Supplier</h2>
        <Table
          columns={columns}
          rows={purchaseOrderPipeline?.leadTimeBySupplier ?? []}
          rowKey={(r) => r.supplierId}
          isLoading={purchaseOrderPipelineStatus === 'loading'}
          emptyMessage="No received orders yet"
        />
      </div>
    </div>
  );
};

export default PurchaseOrderPipelinePage;
