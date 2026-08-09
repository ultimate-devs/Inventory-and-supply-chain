import { runGreedyAllocation } from './greedyAllocation.js';

// Integer Linear Programming (0/1 knapsack) allocation: unlike Greedy and
// Proportional - which both spread leftover budget by partially funding the
// last item they touch - ILP only ever fully funds an item's complete need
// or leaves it untouched, since a half-placed purchase order line isn't a
// realistic outcome. It searches for the subset of items whose combined
// neededValue fits the budget that maximises total urgency served, using
// branch-and-bound with a fractional-relaxation upper bound to prune (the
// standard exact algorithm for 0/1 knapsack). Pure function - no I/O.
//
// Exact only for small candidate sets. Above MAX_EXACT_ITEMS the search space
// is too large to explore in a request/response cycle, so it falls back to
// the Greedy result instead of hanging the request.
export const MAX_EXACT_ITEMS = 20;

// Safety valve: bounds worst-case search time for pathological inputs (many
// items tied on value density defeat the bound's pruning). Never expected to
// trigger for <= MAX_EXACT_ITEMS items with distinct scores, but keeps the
// function's runtime predictable regardless of input shape.
const MAX_NODES_VISITED = 200000;

const buildEmptyResult = (budget) => ({
  allocations: [],
  totalAllocated: 0,
  unallocatedBudget: Math.max(0, Number(budget) || 0),
  itemsFullyCovered: 0,
  itemsPartiallyCovered: 0,
  itemsUncovered: 0,
  weightedUrgencyServed: 0,
});

export const runIlpAllocation = (items = [], budget = 0) => {
  const totalBudget = Math.max(0, Number(budget) || 0);

  if (items.length === 0) return buildEmptyResult(totalBudget);

  // Zero-need items are free wins - fund them without touching the budget or
  // the knapsack search, matching Greedy/Proportional's convention that a
  // zero-need item is trivially fully covered.
  const free = items.filter((c) => !(c.neededValue > 0));
  const priced = items.filter((c) => c.neededValue > 0);

  if (priced.length > MAX_EXACT_ITEMS) {
    const fallback = runGreedyAllocation(items, budget);
    return {
      ...fallback,
      note: `ILP skipped - ${priced.length} candidates exceeds the ${MAX_EXACT_ITEMS}-item exact-optimisation limit, showing the Greedy result instead`,
    };
  }

  // Sort by value density (urgency per pound needed) - not required for
  // correctness, but gives the fractional-relaxation bound below a much
  // tighter estimate, which is what makes the branch-and-bound prune well.
  const sorted = [...priced].sort(
    (a, b) => b.urgencyScore / b.neededValue - a.urgencyScore / a.neededValue,
  );

  // Fractional-relaxation upper bound on the best value achievable from
  // `index` onward given `remainingBudget` - fills items in density order,
  // taking a fractional slice of the first one that doesn't fit. Since the
  // continuous relaxation always dominates the integer optimum, any branch
  // whose current value plus this bound can't beat the best solution found
  // so far is safe to discard.
  const bound = (index, remainingBudget) => {
    let value = 0;
    let budgetLeft = remainingBudget;
    for (let i = index; i < sorted.length; i += 1) {
      const candidate = sorted[i];
      if (candidate.neededValue <= budgetLeft) {
        value += candidate.urgencyScore;
        budgetLeft -= candidate.neededValue;
      } else {
        value += candidate.urgencyScore * (budgetLeft / candidate.neededValue);
        break;
      }
    }
    return value;
  };

  let bestValue = 0;
  let bestChoice = new Array(sorted.length).fill(false);
  const choice = new Array(sorted.length).fill(false);
  let nodesVisited = 0;

  const search = (index, remainingBudget, value) => {
    nodesVisited += 1;
    if (nodesVisited > MAX_NODES_VISITED) return;

    if (index === sorted.length) {
      if (value > bestValue) {
        bestValue = value;
        bestChoice = [...choice];
      }
      return;
    }
    // Prune: even greedily filling the rest fractionally can't beat the best
    // integer solution found so far.
    if (value + bound(index, remainingBudget) <= bestValue) return;

    const candidate = sorted[index];
    if (candidate.neededValue <= remainingBudget) {
      choice[index] = true;
      search(index + 1, remainingBudget - candidate.neededValue, value + candidate.urgencyScore);
      choice[index] = false;
    }
    search(index + 1, remainingBudget, value);
  };

  search(0, totalBudget, 0);

  let totalAllocated = 0;
  let weightedUrgencyServed = 0;
  let itemsFullyCovered = 0;

  const pricedAllocations = sorted.map((candidate, i) => {
    const funded = bestChoice[i];
    if (funded) {
      totalAllocated += candidate.neededValue;
      weightedUrgencyServed += candidate.urgencyScore;
      itemsFullyCovered += 1;
    }
    return {
      item: candidate.item,
      name: candidate.name,
      urgencyScore: candidate.urgencyScore,
      allocatedAmount: funded ? candidate.neededValue : 0,
      allocatedQuantity: funded && candidate.unitCost > 0 ? Math.floor(candidate.neededValue / candidate.unitCost) : 0,
      fractionCovered: funded ? 1 : 0,
    };
  });

  const freeAllocations = free.map((candidate) => ({
    item: candidate.item,
    name: candidate.name,
    urgencyScore: candidate.urgencyScore,
    allocatedAmount: 0,
    allocatedQuantity: 0,
    fractionCovered: 1,
  }));

  itemsFullyCovered += free.length;
  weightedUrgencyServed += free.reduce((sum, candidate) => sum + candidate.urgencyScore, 0);

  return {
    allocations: [...pricedAllocations, ...freeAllocations],
    totalAllocated,
    unallocatedBudget: totalBudget - totalAllocated,
    itemsFullyCovered,
    // ILP never partially funds an item by design - see module comment.
    itemsPartiallyCovered: 0,
    itemsUncovered: pricedAllocations.filter((a) => a.fractionCovered === 0).length,
    weightedUrgencyServed,
  };
};
