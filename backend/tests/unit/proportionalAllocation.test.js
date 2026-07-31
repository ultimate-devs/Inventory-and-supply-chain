import { runProportionalAllocation } from '../../src/services/algorithms/proportionalAllocation.js';

const item = (overrides) => ({
  item: overrides.id,
  name: overrides.id,
  urgencyScore: 50,
  neededValue: 100,
  unitCost: 10,
  ...overrides,
});

describe('runProportionalAllocation', () => {
  it('returns an empty, zeroed result for an empty item list', () => {
    const result = runProportionalAllocation([], 1000);
    expect(result.allocations).toEqual([]);
    expect(result.totalAllocated).toBe(0);
    expect(result.unallocatedBudget).toBe(1000);
  });

  it('allocates nothing when budget is zero', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' })];
    const result = runProportionalAllocation(items, 0);
    expect(result.totalAllocated).toBe(0);
    expect(result.allocations.every((a) => a.allocatedAmount === 0)).toBe(true);
  });

  it('splits budget in proportion to need when nobody hits their cap', () => {
    const items = [item({ id: 'small', neededValue: 100 }), item({ id: 'big', neededValue: 300 })];
    const result = runProportionalAllocation(items, 200);
    const small = result.allocations.find((a) => a.item === 'small');
    const big = result.allocations.find((a) => a.item === 'big');
    expect(small.allocatedAmount).toBeCloseTo(50);
    expect(big.allocatedAmount).toBeCloseTo(150);
  });

  it('redistributes leftover budget from a fully-funded item to the rest', () => {
    // small needs only 20; with proportional shares of a 220 budget across
    // (20, 200) it would get less than 20, but water-filling caps it at need
    // and gives the remainder to "big".
    const items = [item({ id: 'small', neededValue: 20 }), item({ id: 'big', neededValue: 200 })];
    const result = runProportionalAllocation(items, 220);
    const small = result.allocations.find((a) => a.item === 'small');
    const big = result.allocations.find((a) => a.item === 'big');
    expect(small.fractionCovered).toBe(1);
    expect(small.allocatedAmount).toBeCloseTo(20);
    expect(big.allocatedAmount).toBeCloseTo(200);
  });

  it('splits identical (tied) needs evenly', () => {
    const items = [item({ id: 'a', neededValue: 100 }), item({ id: 'b', neededValue: 100 })];
    const result = runProportionalAllocation(items, 100);
    const a = result.allocations.find((x) => x.item === 'a');
    const b = result.allocations.find((x) => x.item === 'b');
    expect(a.allocatedAmount).toBeCloseTo(b.allocatedAmount);
    expect(a.allocatedAmount).toBeCloseTo(50);
  });

  it('treats a zero-need item as trivially fully covered', () => {
    const items = [item({ id: 'zero', neededValue: 0 })];
    const result = runProportionalAllocation(items, 100);
    expect(result.allocations[0].fractionCovered).toBe(1);
    expect(result.totalAllocated).toBe(0);
  });
});
