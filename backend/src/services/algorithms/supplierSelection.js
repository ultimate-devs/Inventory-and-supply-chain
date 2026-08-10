// Greedy supplier selection: recommends the best supplier for an item from
// its catalogue entries, weighing price, lead time, and performance score.
// Pure function - candidates come pre-joined by supplierService.

export const SELECTION_WEIGHTS = Object.freeze({
  price: 0.35,
  leadTime: 0.35,
  performance: 0.3,
});

const normalizeLowerIsBetter = (value, min, max) => (max === min ? 100 : ((max - value) / (max - min)) * 100);

/**
 * candidates: [{ supplierId, supplierName, unitPrice, leadTimeDays, performanceScore, status }]
 * Only 'approved' suppliers are eligible. Returns candidates ranked best-first,
 * each annotated with its component and composite scores. Empty input (or no
 * approved candidates) returns an empty array rather than throwing.
 */
export const rankSuppliersForItem = (candidates = []) => {
  const eligible = candidates.filter((c) => c.status === 'approved');
  if (eligible.length === 0) return [];

  const prices = eligible.map((c) => c.unitPrice);
  const leadTimes = eligible.map((c) => c.leadTimeDays);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minLead = Math.min(...leadTimes);
  const maxLead = Math.max(...leadTimes);

  const scored = eligible.map((c) => {
    const priceScore = normalizeLowerIsBetter(c.unitPrice, minPrice, maxPrice);
    const leadTimeScore = normalizeLowerIsBetter(c.leadTimeDays, minLead, maxLead);
    const performanceScore = Math.min(100, Math.max(0, c.performanceScore));
    const compositeScore =
      priceScore * SELECTION_WEIGHTS.price +
      leadTimeScore * SELECTION_WEIGHTS.leadTime +
      performanceScore * SELECTION_WEIGHTS.performance;
    return { ...c, priceScore, leadTimeScore, compositeScore };
  });

  return scored.sort((a, b) => b.compositeScore - a.compositeScore);
};

export const recommendSupplierForItem = (candidates = []) => rankSuppliersForItem(candidates)[0] ?? null;

// Typed outcome for "pick a supplier for this item" callers (supplierService,
// and transitively the Procurement agent's recommend_supplier tool) - a
// missing supplier is a normal, handleable result to branch on, never an
// exception to catch.
export const SUPPLIER_SELECTION_STATUS = Object.freeze({
  SUCCESS: 'success',
  NO_SUPPLIER_AVAILABLE: 'no_supplier_available',
});

export const selectSupplierForItem = (candidates = []) => {
  const ranked = rankSuppliersForItem(candidates);
  if (ranked.length === 0) {
    return { status: SUPPLIER_SELECTION_STATUS.NO_SUPPLIER_AVAILABLE, recommended: null, ranked: [] };
  }
  return { status: SUPPLIER_SELECTION_STATUS.SUCCESS, recommended: ranked[0], ranked };
};
