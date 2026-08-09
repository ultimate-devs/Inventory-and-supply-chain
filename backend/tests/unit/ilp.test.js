import { runIlpAllocation, MAX_EXACT_ITEMS } from '../../src/services/algorithms/ilp.js';

const item = (overrides) => ({
  item: overrides.id,
  name: overrides.id,
  urgencyScore: 50,
  neededValue: 100,
  unitCost: 10,
  ...overrides,
});

describe('runIlpAllocation', () => {
  it('returns an empty, zeroed result for an empty item list', () => {
    const result = runIlpAllocation([], 1000);
    expect(result.allocations).toEqual([]);
    expect(result.totalAllocated).toBe(0);
    expect(result.unallocatedBudget).toBe(1000);
    expect(result.itemsUncovered).toBe(0);
  });

  it('allocates nothing when budget is zero, leaving every item uncovered', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' })];
    const result = runIlpAllocation(items, 0);
    expect(result.totalAllocated).toBe(0);
    expect(result.itemsUncovered).toBe(2);
  });

  it('never partially funds an item - every allocation is fully covered or untouched', () => {
    const items = [
      item({ id: 'a', urgencyScore: 90, neededValue: 100 }),
      item({ id: 'b', urgencyScore: 40, neededValue: 100 }),
    ];
    const result = runIlpAllocation(items, 150);
    expect(result.itemsPartiallyCovered).toBe(0);
    result.allocations.forEach((a) => {
      expect([0, 1]).toContain(a.fractionCovered);
    });
  });

  it('picks the higher-value combination over the single-highest-urgency item when budget allows', () => {
    // Funding both b+c (urgency 60) beats funding only a (urgency 55) for the same budget -
    // a value-maximising knapsack should find this even though greedy-by-urgency would not.
    const items = [
      item({ id: 'a', urgencyScore: 55, neededValue: 100 }),
      item({ id: 'b', urgencyScore: 30, neededValue: 50 }),
      item({ id: 'c', urgencyScore: 30, neededValue: 50 }),
    ];
    const result = runIlpAllocation(items, 100);
    const b = result.allocations.find((a) => a.item === 'b');
    const c = result.allocations.find((a) => a.item === 'c');
    const a = result.allocations.find((a2) => a2.item === 'a');
    expect(b.fractionCovered).toBe(1);
    expect(c.fractionCovered).toBe(1);
    expect(a.fractionCovered).toBe(0);
    expect(result.weightedUrgencyServed).toBe(60);
  });

  it('fully funds every item and leaves budget unallocated when budget exceeds total need', () => {
    const items = [item({ id: 'a', neededValue: 50 }), item({ id: 'b', neededValue: 50 })];
    const result = runIlpAllocation(items, 1000);
    expect(result.totalAllocated).toBe(100);
    expect(result.unallocatedBudget).toBe(900);
    expect(result.itemsFullyCovered).toBe(2);
  });

  it('treats a zero-need item as trivially fully covered without spending budget', () => {
    const items = [item({ id: 'zero', neededValue: 0, urgencyScore: 99 })];
    const result = runIlpAllocation(items, 100);
    expect(result.allocations[0].fractionCovered).toBe(1);
    expect(result.allocations[0].allocatedAmount).toBe(0);
    expect(result.totalAllocated).toBe(0);
  });

  it('falls back to the greedy result with a note when candidates exceed the exact-optimisation limit', () => {
    const items = Array.from({ length: MAX_EXACT_ITEMS + 1 }, (_, i) =>
      item({ id: `item-${i}`, urgencyScore: 10 + i, neededValue: 20 }),
    );
    const result = runIlpAllocation(items, 100);
    expect(result.note).toMatch(/skipped/i);
    expect(result.allocations.length).toBe(items.length);
  });

  it('stays within the exact-optimisation limit and does not fall back for exactly MAX_EXACT_ITEMS priced items', () => {
    const items = Array.from({ length: MAX_EXACT_ITEMS }, (_, i) =>
      item({ id: `item-${i}`, urgencyScore: 10 + i, neededValue: 20 }),
    );
    const result = runIlpAllocation(items, 100);
    expect(result.note).toBeUndefined();
  });
});
