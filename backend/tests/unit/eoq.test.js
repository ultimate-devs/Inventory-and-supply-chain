import { calculateEOQ } from '../../src/services/algorithms/eoq.js';

describe('calculateEOQ', () => {
  it('computes the Wilson formula for typical inputs', () => {
    // sqrt((2*1000*50)/2) = sqrt(50000) = 223.6067...
    const result = calculateEOQ({ annualDemand: 1000, orderingCost: 50, holdingCostPerUnit: 2 });
    expect(result).toBeCloseTo(223.6068, 3);
  });

  it('returns 0 when annual demand is 0', () => {
    expect(calculateEOQ({ annualDemand: 0, orderingCost: 50, holdingCostPerUnit: 2 })).toBe(0);
  });

  it('returns 0 when ordering cost is 0', () => {
    expect(calculateEOQ({ annualDemand: 1000, orderingCost: 0, holdingCostPerUnit: 2 })).toBe(0);
  });

  it('returns 0 when holding cost is 0 rather than dividing by zero', () => {
    expect(calculateEOQ({ annualDemand: 1000, orderingCost: 50, holdingCostPerUnit: 0 })).toBe(0);
  });

  it('handles very large demand without overflowing to Infinity', () => {
    const result = calculateEOQ({ annualDemand: 10_000_000, orderingCost: 100, holdingCostPerUnit: 5 });
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });

  it('treats negative inputs as zero', () => {
    expect(calculateEOQ({ annualDemand: -100, orderingCost: 50, holdingCostPerUnit: 2 })).toBe(0);
  });
});
