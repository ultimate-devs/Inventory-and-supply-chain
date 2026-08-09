import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type {
  StockTurnoverRow,
  StockStatusBreakdownData,
  AlgorithmComparisonRow,
  BudgetUtilisationPoint,
  SupplierPerformanceRow,
  PoPipelineData,
  CategorySpendRow,
} from '../types/reports';

const downloadCsv = async (path: string, filename: string) => {
  const res = await api.get(path, { params: { format: 'csv' }, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const reportService = {
  async stockTurnover(params: { category?: string; days?: number } = {}) {
    const { data } = await api.get<ApiEnvelope<StockTurnoverRow[]>>('/reports/stock-turnover', { params });
    return data.data;
  },
  downloadStockTurnoverCsv: () => downloadCsv('/reports/stock-turnover', 'stock-turnover.csv'),

  async stockStatusBreakdown() {
    const { data } = await api.get<ApiEnvelope<StockStatusBreakdownData>>('/reports/stock-status-breakdown');
    return data.data;
  },
  downloadStockStatusBreakdownCsv: () => downloadCsv('/reports/stock-status-breakdown', 'stock-status-breakdown.csv'),

  async algorithmComparison(params: { limit?: number } = {}) {
    const { data } = await api.get<ApiEnvelope<AlgorithmComparisonRow[]>>('/reports/algorithm-comparison', { params });
    return data.data;
  },
  downloadAlgorithmComparisonCsv: () => downloadCsv('/reports/algorithm-comparison', 'algorithm-comparison.csv'),

  async budgetUtilisation(params: { from?: string; to?: string } = {}) {
    const { data } = await api.get<ApiEnvelope<BudgetUtilisationPoint[]>>('/reports/budget-utilisation', { params });
    return data.data;
  },
  downloadBudgetUtilisationCsv: () => downloadCsv('/reports/budget-utilisation', 'budget-utilisation.csv'),

  async supplierPerformance() {
    const { data } = await api.get<ApiEnvelope<SupplierPerformanceRow[]>>('/reports/supplier-performance');
    return data.data;
  },
  downloadSupplierPerformanceCsv: () => downloadCsv('/reports/supplier-performance', 'supplier-performance.csv'),

  async purchaseOrderPipeline() {
    const { data } = await api.get<ApiEnvelope<PoPipelineData>>('/reports/po-pipeline');
    return data.data;
  },
  downloadPurchaseOrderPipelineCsv: () => downloadCsv('/reports/po-pipeline', 'po-pipeline.csv'),

  async categorySpend(params: { from?: string; to?: string } = {}) {
    const { data } = await api.get<ApiEnvelope<CategorySpendRow[]>>('/reports/category-spend', { params });
    return data.data;
  },
  downloadCategorySpendCsv: () => downloadCsv('/reports/category-spend', 'category-spend.csv'),
};
