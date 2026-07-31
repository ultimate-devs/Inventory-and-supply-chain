import { runGreedyAllocation } from '../../src/services/algorithms/greedyAllocation.js';

const item = (overrides) => ({
  item: overrides.id,
  name: overrides.id,
  urgencyScore: 50,
  neededValue: 100,
  unitCost: 10,
  ...overrides,
});

describe('runGreedyAllocation', () => {
  it('returns an empty, zeroed result for an empty item list', () => {
    const result = runGreedyAllocation([], 1000);
    expect(result.allocations).toEqual([]);
    expect(result.totalAllocated).toBe(0);
    expect(result.unallocatedBudget).toBe(1000);
    expect(result.itemsFullyCovered).toBe(0);
    expect(result.itemsUncovered).toBe(0);
  });

  it('allocates nothing when budget is zero, leaving every item uncovered', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' })];
    const result = runGreedyAllocation(items, 0);
    expect(result.totalAllocated).toBe(0);
    expect(result.unallocatedBudget).toBe(0);
    expect(result.itemsUncovered).toBe(2);
    expect(result.allocations.every((a) => a.allocatedAmount === 0)).toBe(true);
  });

  it('fully funds the single most urgent item before touching the next', () => {
    const items = [
      item({ id: 'urgent', urgencyScore: 90, neededValue: 100 }),
      item({ id: 'mild', urgencyScore: 40, neededValue: 100 }),
    ];
    const result = runGreedyAllocation(items, 150);
    const urgent = result.allocations.find((a) => a.item === 'urgent');
    const mild = result.allocations.find((a) => a.item === 'mild');
    expect(urgent.fractionCovered).toBe(1);
    expect(mild.fractionCovered).toBeCloseTo(0.5);
    expect(result.itemsFullyCovered).toBe(1);
    expect(result.itemsPartiallyCovered).toBe(1);
  });

  it('breaks ties in urgency score by funding the cheaper need first', () => {
    const items = [
      item({ id: 'expensive', urgencyScore: 50, neededValue: 200 }),
      item({ id: 'cheap', urgencyScore: 50, neededValue: 50 }),
    ];
    const result = runGreedyAllocation(items, 60);
    const cheap = result.allocations.find((a) => a.item === 'cheap');
    const expensive = result.allocations.find((a) => a.item === 'expensive');
    expect(cheap.fractionCovered).toBe(1);
    expect(expensive.allocatedAmount).toBe(10);
  });

  it('fully funds every item and leaves budget unallocated when budget exceeds total need', () => {
    const items = [item({ id: 'a', neededValue: 50 }), item({ id: 'b', neededValue: 50 })];
    const result = runGreedyAllocation(items, 1000);
    expect(result.totalAllocated).toBe(100);
    expect(result.unallocatedBudget).toBe(900);
    expect(result.itemsFullyCovered).toBe(2);
  });

  it('treats a zero-need item as trivially fully covered without spending budget', () => {
    const items = [item({ id: 'zero', neededValue: 0, urgencyScore: 99 })];
    const result = runGreedyAllocation(items, 100);
    expect(result.allocations[0].fractionCovered).toBe(1);
    expect(result.allocations[0].allocatedAmount).toBe(0);
    expect(result.totalAllocated).toBe(0);
  });
});
