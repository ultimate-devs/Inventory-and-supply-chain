import { runGreedyAllocation } from './greedyAllocation.js';
import { runProportionalAllocation } from './proportionalAllocation.js';
import { runIlpAllocation } from './ilp.js';

const delta = (a, b) => ({
  totalAllocated: a.totalAllocated - b.totalAllocated,
  unallocatedBudget: a.unallocatedBudget - b.unallocatedBudget,
  itemsFullyCovered: a.itemsFullyCovered - b.itemsFullyCovered,
  itemsPartiallyCovered: a.itemsPartiallyCovered - b.itemsPartiallyCovered,
  itemsUncovered: a.itemsUncovered - b.itemsUncovered,
  weightedUrgencyServed: a.weightedUrgencyServed - b.weightedUrgencyServed,
});

/**
 * Runs all three allocators against the same items/budget and returns them
 * side-by-side. `deltas` keeps its original greedy-vs-proportional shape (the
 * existing Comparison page reads it directly); `deltas.ilp` is an additive
 * extension carrying the two ILP comparisons for the newer report/UI.
 */
export const compareAllocations = (items = [], budget = 0) => {
  const greedy = runGreedyAllocation(items, budget);
  const proportional = runProportionalAllocation(items, budget);
  const ilp = runIlpAllocation(items, budget);

  return {
    greedy,
    proportional,
    ilp,
    deltas: {
      ...delta(greedy, proportional),
      ilp: {
        vsGreedy: delta(ilp, greedy),
        vsProportional: delta(ilp, proportional),
      },
    },
  };
};
