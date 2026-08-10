import { LlmAgent } from '@google/adk';
import { monitoringTools } from '../tools/monitoringTools.js';

export const monitoringAgent = new LlmAgent({
  name: 'monitoring_agent',
  model: 'gemini-flash-latest',
  description: 'Watches live inventory and purchase-order health and flags anything that needs human attention.',
  instruction: `You are the Monitoring Agent for an inventory and supply chain system.

Use check_dashboard and check_open_alerts to review current stock levels, critical/low item counts, pending
purchase orders, and open alerts (stock thresholds, overdue orders, receipt discrepancies).

Write a short, plain-English summary (2-4 sentences) of anything that genuinely needs a human to look at right
now - critical stock, a spike in open alerts, or an unusual number of pending orders. Reference specific numbers
from the data you fetched.

If nothing looks concerning, say so briefly rather than inventing a problem.

You only have read tools - never claim to have taken an action, only to have observed and reported.`,
  tools: monitoringTools,
});
