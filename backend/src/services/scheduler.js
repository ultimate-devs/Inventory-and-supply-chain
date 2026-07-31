import cron from 'node-cron';
import { recalculateAllItems } from './algorithms/recalculateItemMetrics.js';
import { flagOverduePurchaseOrders } from './purchaseOrderService.js';
import { isTest } from '../config/env.js';

let recalcTask;
let overduePoTask;

export const startScheduledJobs = () => {
  if (isTest || recalcTask) return;

  // Hourly - re-run ROP/EOQ/stock-status for every item; Item's post-save
  // hook opens/resolves low/critical/excess-stock alerts as a side effect.
  recalcTask = cron.schedule('0 * * * *', async () => {
    try {
      const count = await recalculateAllItems();
      // eslint-disable-next-line no-console
      console.log(`[cron] Recalculated metrics for ${count} items`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[cron] Item recalculation failed:', err.message);
    }
  });

  // Hourly (offset by 30 minutes) - raise overdue_po alerts for POs whose
  // expected delivery date has passed without a full receipt.
  overduePoTask = cron.schedule('30 * * * *', async () => {
    try {
      const count = await flagOverduePurchaseOrders();
      // eslint-disable-next-line no-console
      console.log(`[cron] Flagged ${count} overdue purchase orders`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[cron] Overdue PO check failed:', err.message);
    }
  });
};

export const stopScheduledJobs = () => {
  recalcTask?.stop();
  recalcTask = undefined;
  overduePoTask?.stop();
  overduePoTask = undefined;
};
