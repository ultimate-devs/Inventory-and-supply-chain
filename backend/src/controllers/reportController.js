import * as reportService from '../services/reportService.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';
import { toCsv } from '../utils/csv.js';

// Every report supports `?format=csv`, exporting whichever part of its
// payload is the primary tabular result (documented per-report below).
// `rows`/`columns` describe that CSV shape; the JSON response always returns
// the full, possibly-nested `data` payload regardless of format.
const respond = (req, res, { data, message, csv }) => {
  if (req.query.format === 'csv' && csv) {
    const body = toCsv(csv.rows, csv.columns);
    res.type('text/csv').attachment(`${csv.filename}.csv`).send(body);
    return;
  }
  sendResponse(res, 200, { data, message });
};

export const stockTurnover = asyncHandler(async (req, res) => {
  const rows = await reportService.getStockTurnoverReport({
    category: req.query.category,
    days: req.query.days ? Number(req.query.days) : undefined,
  });
  respond(req, res, {
    data: rows,
    message: 'Stock turnover report retrieved',
    csv: {
      filename: 'stock-turnover',
      rows,
      columns: [
        { key: 'sku', header: 'SKU' },
        { key: 'name', header: 'Item' },
        { key: 'category', header: 'Category' },
        { key: 'annualDemand', header: 'Annual Demand' },
        { key: 'avgStock', header: 'Average Stock' },
        { key: 'turnoverRatio', header: 'Turnover Ratio' },
      ],
    },
  });
});

export const stockStatusBreakdown = asyncHandler(async (req, res) => {
  const data = await reportService.getStockStatusBreakdownReport();
  respond(req, res, {
    data,
    message: 'Stock status breakdown report retrieved',
    csv: {
      filename: 'stock-status-breakdown',
      rows: data.byCategory,
      columns: [
        { key: 'category', header: 'Category' },
        { key: 'stockStatus', header: 'Stock Status' },
        { key: 'count', header: 'Count' },
      ],
    },
  });
});

export const algorithmComparison = asyncHandler(async (req, res) => {
  const data = await reportService.getAlgorithmComparisonReport({ limit: req.query.limit });
  respond(req, res, {
    data,
    message: 'Algorithm comparison report retrieved',
    csv: {
      filename: 'algorithm-comparison',
      rows: data,
      columns: [
        { key: 'createdAt', header: 'Date' },
        { key: 'budget', header: 'Budget' },
        { key: 'runBy', header: 'Run By' },
        { key: 'greedy.budgetUtilisationPct', header: 'Greedy Utilisation %' },
        { key: 'proportional.budgetUtilisationPct', header: 'Proportional Utilisation %' },
        { key: 'ilp.budgetUtilisationPct', header: 'ILP Utilisation %' },
      ],
    },
  });
});

export const budgetUtilisationOverTime = asyncHandler(async (req, res) => {
  const data = await reportService.getBudgetUtilisationOverTimeReport({ from: req.query.from, to: req.query.to });
  respond(req, res, {
    data,
    message: 'Budget utilisation over time report retrieved',
    csv: {
      filename: 'budget-utilisation-over-time',
      rows: data,
      columns: [
        { key: 'createdAt', header: 'Date' },
        { key: 'budget', header: 'Budget' },
        { key: 'greedyUtilisationPct', header: 'Greedy Utilisation %' },
        { key: 'proportionalUtilisationPct', header: 'Proportional Utilisation %' },
        { key: 'ilpUtilisationPct', header: 'ILP Utilisation %' },
      ],
    },
  });
});

export const supplierPerformance = asyncHandler(async (req, res) => {
  const data = await reportService.getSupplierPerformanceReport();
  respond(req, res, {
    data,
    message: 'Supplier performance report retrieved',
    csv: {
      filename: 'supplier-performance',
      rows: data,
      columns: [
        { key: 'name', header: 'Supplier' },
        { key: 'onTimeRate', header: 'On-Time Rate' },
        { key: 'accuracyRate', header: 'Accuracy Rate' },
        { key: 'leadTimeReliability', header: 'Lead Time Reliability' },
        { key: 'priceConsistency', header: 'Price Consistency' },
        { key: 'performanceScore', header: 'Overall Score' },
      ],
    },
  });
});

export const purchaseOrderPipeline = asyncHandler(async (req, res) => {
  const data = await reportService.getPurchaseOrderPipelineReport();
  respond(req, res, {
    data,
    message: 'Purchase order pipeline report retrieved',
    csv: {
      filename: 'po-pipeline-lead-time',
      rows: data.leadTimeBySupplier,
      columns: [
        { key: 'supplierName', header: 'Supplier' },
        { key: 'avgLeadTimeDays', header: 'Avg Lead Time (days)' },
        { key: 'minLeadTimeDays', header: 'Min Lead Time (days)' },
        { key: 'maxLeadTimeDays', header: 'Max Lead Time (days)' },
        { key: 'receivedCount', header: 'Received Orders' },
      ],
    },
  });
});

export const categorySpend = asyncHandler(async (req, res) => {
  const data = await reportService.getCategorySpendReport({ from: req.query.from, to: req.query.to });
  respond(req, res, {
    data,
    message: 'Category spend report retrieved',
    csv: {
      filename: 'category-spend',
      rows: data,
      columns: [
        { key: 'category', header: 'Category' },
        { key: 'committedSpend', header: 'Committed Spend' },
        { key: 'receivedSpend', header: 'Received Spend' },
        { key: 'lineCount', header: 'PO Lines' },
      ],
    },
  });
});
