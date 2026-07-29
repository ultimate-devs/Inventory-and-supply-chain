import { Item } from '../../models/Item.js';

/**
 * Re-fetches an item and saves it, which triggers Item's own pre-save hook
 * to recompute ROP/EOQ/stock-status against current system settings. Used
 * after stock movements (optionally within their transaction session) and
 * by the nightly cron sweep.
 */
export const recalculateItemMetrics = async (itemId, { session } = {}) => {
  const item = await Item.findById(itemId).session(session ?? null);
  if (!item) return null;
  await item.save({ session });
  return item;
};

export const recalculateAllItems = async () => {
  const items = await Item.find({});
  let count = 0;
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    await item.save();
    count += 1;
  }
  return count;
};
