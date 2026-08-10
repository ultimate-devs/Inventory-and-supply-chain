import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { readonlyClient } from '../apiClient.js';

const checkDashboardTool = new FunctionTool({
  name: 'check_dashboard',
  description:
    'Fetches live dashboard KPIs: total items, critical/low/excess item counts, pending purchase orders, and stock-vs-reorder-point by category.',
  parameters: z.object({}),
  execute: async () => {
    const data = await readonlyClient.get('/dashboard');
    return { status: 'success', ...data };
  },
});

const checkOpenAlertsTool = new FunctionTool({
  name: 'check_open_alerts',
  description: 'Lists currently open alerts: low/critical/excess stock, overdue purchase orders, and quantity discrepancies.',
  parameters: z.object({}),
  execute: async () => {
    const alerts = await readonlyClient.get('/alerts?status=open');
    return { status: 'success', count: alerts.length, alerts };
  },
});

export const monitoringTools = [checkDashboardTool, checkOpenAlertsTool];
