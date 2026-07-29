export const STOCK_STATUS = Object.freeze({
  CRITICAL: 'critical',
  LOW: 'low',
  OK: 'ok',
  EXCESS: 'excess',
});

/**
 * Classifies current stock relative to the reorder point and safety stock:
 *  - CRITICAL: at or below safety stock (or zero)
 *  - LOW:      above safety stock but at or below the reorder point
 *  - EXCESS:   above reorderPoint x excessMultiplier
 *  - OK:       everything in between
 *
 * When reorderPoint is 0 (no demand history yet), any stock above safety
 * stock is treated as OK rather than immediately EXCESS, since there isn't
 * enough signal yet to call it excess.
 */
export const classifyStockStatus = ({ currentStock, reorderPoint, safetyStock = 0, excessMultiplier = 3 }) => {
  const stock = Math.max(0, Number(currentStock) || 0);
  const rop = Math.max(0, Number(reorderPoint) || 0);
  const safety = Math.max(0, Number(safetyStock) || 0);
  const multiplier = Math.max(1, Number(excessMultiplier) || 3);

  if (stock <= safety) {
    return STOCK_STATUS.CRITICAL;
  }

  if (stock <= rop) {
    return STOCK_STATUS.LOW;
  }

  if (rop > 0 && stock > rop * multiplier) {
    return STOCK_STATUS.EXCESS;
  }

  return STOCK_STATUS.OK;
};
