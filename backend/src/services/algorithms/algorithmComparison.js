import { runGreedyAllocation } from './greedyAllocation.js';
import { runProportionalAllocation } from './proportionalAllocation.js';

/**
 * Runs both allocators against the same items/budget and returns them
 * side-by-side plus the deltas the Comparison page highlights.
 */
export const compareAllocations = (items = [], budget = 0) => {
  const greedy = runGreedyAllocation(items, budget);
  const proportional = runProportionalAllocation(items, budget);

  return {
    greedy,
    proportional,
    deltas: {
      totalAllocated: greedy.totalAllocated - proportional.totalAllocated,
      unallocatedBudget: greedy.unallocatedBudget - proportional.unallocatedBudget,
      itemsFullyCovered: greedy.itemsFullyCovered - proportional.itemsFullyCovered,
      itemsPartiallyCovered: greedy.itemsPartiallyCovered - proportional.itemsPartiallyCovered,
      itemsUncovered: greedy.itemsUncovered - proportional.itemsUncovered,
      weightedUrgencyServed: greedy.weightedUrgencyServed - proportional.weightedUrgencyServed,
    },
  };
};
