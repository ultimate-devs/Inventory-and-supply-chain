import { computeUrgencyScore, computeQuantityNeeded } from '../../src/services/algorithms/urgencyScore.js';

describe('computeUrgencyScore', () => {
  it('scores 100 when there is no reorder point signal but stock is at/under safety stock', () => {
    expect(computeUrgencyScore({ currentStock: 0, reorderPoint: 0, safetyStock: 5 })).toBe(100);
  });

  it('scores 0 when there is no reorder point signal and stock is above safety stock', () => {
    expect(computeUrgencyScore({ currentStock: 50, reorderPoint: 0, safetyStock: 5 })).toBe(0);
  });

  it('scores higher for a bigger deficit below the reorder point', () => {
    const small = computeUrgencyScore({ currentStock: 90, reorderPoint: 100, safetyStock: 0 });
    const big = computeUrgencyScore({ currentStock: 10, reorderPoint: 100, safetyStock: 0 });
    expect(big).toBeGreaterThan(small);
  });

  it('adds a flat bonus for items at or under safety stock', () => {
    const atSafety = computeUrgencyScore({ currentStock: 10, reorderPoint: 100, safetyStock: 10 });
    const aboveSafety = computeUrgencyScore({ currentStock: 10, reorderPoint: 100, safetyStock: 0 });
    expect(atSafety).toBeGreaterThan(aboveSafety);
  });

  it('caps the score at 100', () => {
    expect(computeUrgencyScore({ currentStock: 0, reorderPoint: 10, safetyStock: 10 })).toBe(100);
  });

  it('produces identical (tied) scores for identical inputs', () => {
    const a = computeUrgencyScore({ currentStock: 20, reorderPoint: 50, safetyStock: 10 });
    const b = computeUrgencyScore({ currentStock: 20, reorderPoint: 50, safetyStock: 10 });
    expect(a).toBe(b);
  });
});

describe('computeQuantityNeeded', () => {
  it('returns 0 when stock already covers both EOQ and reorder point', () => {
    expect(computeQuantityNeeded({ currentStock: 1000, reorderPoint: 50, economicOrderQuantity: 0 })).toBe(0);
  });

  it('uses the reorder-point deficit when it exceeds the EOQ', () => {
    expect(computeQuantityNeeded({ currentStock: 0, reorderPoint: 100, economicOrderQuantity: 20 })).toBe(100);
  });

  it('uses the EOQ when it exceeds the reorder-point deficit', () => {
    expect(computeQuantityNeeded({ currentStock: 90, reorderPoint: 100, economicOrderQuantity: 50 })).toBe(50);
  });

  it('rounds up to a whole unit', () => {
    expect(computeQuantityNeeded({ currentStock: 0, reorderPoint: 10.2, economicOrderQuantity: 0 })).toBe(11);
  });
});
