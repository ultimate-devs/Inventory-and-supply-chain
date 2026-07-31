// Urgency-ranked greedy budget allocation: spend the budget on the most
// urgent item first, fully funding it before moving to the next, until the
// budget runs out. Pure function - no I/O - so it's trivial to unit test and
// safe to run in a preview/what-if flow.

/**
 * items: [{ item, name, urgencyScore, neededValue, unitCost }]
 *   neededValue = quantityNeeded * unitCost, i.e. the cost to fully satisfy
 *   this item's need.
 * budget: total funds available.
 *
 * Ties in urgencyScore are broken by cheapest-need-first, so a fixed budget
 * covers as many items as possible among equally urgent ones.
 */
export const runGreedyAllocation = (items = [], budget = 0) => {
  const totalBudget = Math.max(0, Number(budget) || 0);
  const sorted = [...items].sort(
    (a, b) => b.urgencyScore - a.urgencyScore || a.neededValue - b.neededValue,
  );

  let remaining = totalBudget;
  let weightedUrgencyServed = 0;
  let itemsFullyCovered = 0;
  let itemsPartiallyCovered = 0;
  let itemsUncovered = 0;

  const allocations = sorted.map((candidate) => {
    const needed = Math.max(0, candidate.neededValue);
    const allocatedAmount = needed === 0 ? 0 : Math.min(needed, Math.max(0, remaining));
    const fractionCovered = needed === 0 ? 1 : allocatedAmount / needed;
    const allocatedQuantity = candidate.unitCost > 0 ? Math.floor(allocatedAmount / candidate.unitCost) : 0;

    remaining = Math.max(0, remaining - allocatedAmount);
    weightedUrgencyServed += candidate.urgencyScore * fractionCovered;

    if (fractionCovered >= 0.999999) itemsFullyCovered += 1;
    else if (fractionCovered > 0) itemsPartiallyCovered += 1;
    else itemsUncovered += 1;

    return {
      item: candidate.item,
      name: candidate.name,
      urgencyScore: candidate.urgencyScore,
      allocatedAmount,
      allocatedQuantity,
      fractionCovered,
    };
  });

  return {
    allocations,
    totalAllocated: totalBudget - remaining,
    unallocatedBudget: remaining,
    itemsFullyCovered,
    itemsPartiallyCovered,
    itemsUncovered,
    weightedUrgencyServed,
  };
};
