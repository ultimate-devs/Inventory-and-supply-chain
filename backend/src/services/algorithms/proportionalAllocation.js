// Proportional budget allocation baseline: splits the budget across items in
// proportion to their need, water-filling in rounds so budget an item can't
// use (because it's already fully funded) is redistributed to the rest
// rather than wasted. Pure function, mirrors greedyAllocation's shape so the
// two are directly comparable.

export const runProportionalAllocation = (items = [], budget = 0) => {
  const totalBudget = Math.max(0, Number(budget) || 0);
  const candidates = items.map((candidate) => ({
    ...candidate,
    remainingNeed: Math.max(0, candidate.neededValue),
    allocatedAmount: 0,
  }));

  let remaining = totalBudget;
  let active = candidates.filter((c) => c.remainingNeed > 1e-9);
  let guard = candidates.length + 5;

  while (remaining > 1e-9 && active.length > 0 && guard > 0) {
    guard -= 1;
    const activeTotalNeed = active.reduce((sum, c) => sum + c.remainingNeed, 0);
    if (activeTotalNeed <= 1e-9) break;

    let spentThisRound = 0;
    for (const candidate of active) {
      const share = (candidate.remainingNeed / activeTotalNeed) * remaining;
      const give = Math.min(share, candidate.remainingNeed);
      candidate.allocatedAmount += give;
      candidate.remainingNeed -= give;
      spentThisRound += give;
    }
    remaining -= spentThisRound;
    active = active.filter((c) => c.remainingNeed > 1e-9);
    if (spentThisRound <= 1e-9) break;
  }

  let weightedUrgencyServed = 0;
  let itemsFullyCovered = 0;
  let itemsPartiallyCovered = 0;
  let itemsUncovered = 0;

  const allocations = candidates.map((candidate) => {
    const needed = Math.max(0, candidate.neededValue);
    const fractionCovered = needed === 0 ? 1 : candidate.allocatedAmount / needed;
    const allocatedQuantity = candidate.unitCost > 0 ? Math.floor(candidate.allocatedAmount / candidate.unitCost) : 0;

    weightedUrgencyServed += candidate.urgencyScore * fractionCovered;
    if (fractionCovered >= 0.999999) itemsFullyCovered += 1;
    else if (fractionCovered > 0) itemsPartiallyCovered += 1;
    else itemsUncovered += 1;

    return {
      item: candidate.item,
      name: candidate.name,
      urgencyScore: candidate.urgencyScore,
      allocatedAmount: candidate.allocatedAmount,
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
