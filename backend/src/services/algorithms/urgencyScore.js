// Pure helpers turning an item's live stock metrics into (a) an urgency score
// used to rank items for the Greedy budget allocator, and (b) the quantity
// that would need to be bought to clear the deficit.

/**
 * 0-100 urgency. When reorderPoint is 0 (no demand signal yet) urgency comes
 * purely from being at/under safety stock. Otherwise it's the deficit below
 * the reorder point (as a percentage of the reorder point), with a flat bonus
 * for items already at or under safety stock so critical items always
 * outrank merely-low ones with a similar deficit ratio.
 */
export const computeUrgencyScore = ({ currentStock, reorderPoint, safetyStock = 0 }) => {
  const stock = Math.max(0, Number(currentStock) || 0);
  const rop = Math.max(0, Number(reorderPoint) || 0);
  const safety = Math.max(0, Number(safetyStock) || 0);
  const atOrBelowSafety = stock <= safety;

  if (rop <= 0) {
    return atOrBelowSafety ? 100 : 0;
  }

  const deficit = Math.max(0, rop - stock);
  const deficitScore = (deficit / rop) * 100;
  const score = deficitScore + (atOrBelowSafety ? 20 : 0);
  return Math.round(Math.min(100, score) * 100) / 100;
};

/**
 * Quantity worth ordering: prefer the EOQ (the economically optimal batch)
 * but never less than what's needed to clear the reorder-point deficit.
 */
export const computeQuantityNeeded = ({ currentStock, reorderPoint, economicOrderQuantity }) => {
  const stock = Math.max(0, Number(currentStock) || 0);
  const rop = Math.max(0, Number(reorderPoint) || 0);
  const eoq = Math.max(0, Number(economicOrderQuantity) || 0);
  const deficit = Math.max(0, rop - stock);
  return Math.ceil(Math.max(eoq, deficit));
};
