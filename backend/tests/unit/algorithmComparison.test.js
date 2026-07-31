import { compareAllocations } from '../../src/services/algorithms/algorithmComparison.js';

describe('compareAllocations', () => {
  it('returns matching zeroed results for an empty item list', () => {
    const result = compareAllocations([], 500);
    expect(result.greedy.totalAllocated).toBe(0);
    expect(result.proportional.totalAllocated).toBe(0);
    expect(result.deltas.totalAllocated).toBe(0);
  });

  it('produces visibly different, explainable results for a mixed-urgency item set', () => {
    const items = [
      { item: 'a', name: 'Critical Widget', urgencyScore: 95, neededValue: 200, unitCost: 10 },
      { item: 'b', name: 'Mild Widget', urgencyScore: 30, neededValue: 200, unitCost: 10 },
    ];
    const result = compareAllocations(items, 200);

    // Greedy fully funds the most urgent item and leaves the other empty.
    const greedyCritical = result.greedy.allocations.find((a) => a.item === 'a');
    expect(greedyCritical.fractionCovered).toBe(1);

    // Proportional splits evenly since both need the same amount.
    const proportionalCritical = result.proportional.allocations.find((a) => a.item === 'a');
    const proportionalMild = result.proportional.allocations.find((a) => a.item === 'b');
    expect(proportionalCritical.allocatedAmount).toBeCloseTo(proportionalMild.allocatedAmount);

    // Greedy should serve strictly more weighted urgency than proportional here.
    expect(result.deltas.weightedUrgencyServed).toBeGreaterThan(0);
  });
});
