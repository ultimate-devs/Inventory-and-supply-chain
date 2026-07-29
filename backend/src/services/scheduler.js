import cron from 'node-cron';
import { recalculateAllItems } from './algorithms/recalculateItemMetrics.js';
import { isTest } from '../config/env.js';

let task;

export const startScheduledJobs = () => {
  if (isTest || task) return;
  // Nightly at 02:00 - re-run ROP/EOQ/stock-status for every item.
  task = cron.schedule('0 2 * * *', async () => {
    try {
      const count = await recalculateAllItems();
      // eslint-disable-next-line no-console
      console.log(`[cron] Recalculated metrics for ${count} items`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[cron] Item recalculation failed:', err.message);
    }
  });
};

export const stopScheduledJobs = () => {
  task?.stop();
  task = undefined;
};
