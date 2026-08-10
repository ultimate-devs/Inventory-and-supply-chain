import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { readonlyClient } from '../apiClient.js';

const runGreedyAlgorithmTool = new FunctionTool({
  name: 'run_greedy_algorithm',
  description:
    'Runs the Greedy, Proportional, and ILP budget allocation algorithms side by side against current low-stock items and saves the run to history.',
  parameters: z.object({
    budget: z.number().min(0).describe('Total budget available to allocate'),
    items: z
      .array(z.string())
      .optional()
      .describe('Optional specific item ids to consider; defaults to all low-stock/critical items'),
  }),
  execute: async ({ budget, items }) => {
    const result = await readonlyClient.post('/algorithms/compare', { budget, items });
    return { status: 'success', ...result };
  },
});

const REPORT_PATHS = {
  stock_turnover: '/reports/stock-turnover',
  stock_status_breakdown: '/reports/stock-status-breakdown',
  algorithm_comparison: '/reports/algorithm-comparison',
  budget_utilisation: '/reports/budget-utilisation',
  supplier_performance: '/reports/supplier-performance',
  po_pipeline: '/reports/po-pipeline',
  category_spend: '/reports/category-spend',
};

const readReportDataTool = new FunctionTool({
  name: 'read_report_data',
  description: `Reads one of the analytics reports: ${Object.keys(REPORT_PATHS).join(', ')}.`,
  parameters: z.object({ report: z.enum(Object.keys(REPORT_PATHS)) }),
  execute: async ({ report }) => {
    const data = await readonlyClient.get(REPORT_PATHS[report]);
    return { status: 'success', report, data };
  },
});

export const analyticsTools = [runGreedyAlgorithmTool, readReportDataTool];
