import { rankSuppliersForItem, recommendSupplierForItem } from '../../src/services/algorithms/supplierSelection.js';

describe('greedy supplier selection', () => {
  it('returns an empty list for no candidates', () => {
    expect(rankSuppliersForItem([])).toEqual([]);
    expect(recommendSupplierForItem([])).toBeNull();
  });

  it('excludes suppliers that are not approved', () => {
    const candidates = [
      { supplierId: 'a', unitPrice: 10, leadTimeDays: 5, performanceScore: 90, status: 'pending' },
      { supplierId: 'b', unitPrice: 12, leadTimeDays: 5, performanceScore: 80, status: 'suspended' },
    ];
    expect(rankSuppliersForItem(candidates)).toEqual([]);
  });

  it('recommends the single approved candidate when there is only one', () => {
    const candidates = [{ supplierId: 'a', unitPrice: 10, leadTimeDays: 5, performanceScore: 90, status: 'approved' }];
    const top = recommendSupplierForItem(candidates);
    expect(top.supplierId).toBe('a');
    // Sole candidate ties itself on price/lead time -> 100 on those; performance carries through as-is.
    expect(top.compositeScore).toBe(100 * 0.35 + 100 * 0.35 + 90 * 0.3);
  });

  it('prefers cheaper, faster, higher-scoring suppliers', () => {
    const candidates = [
      { supplierId: 'cheap-fast-good', unitPrice: 5, leadTimeDays: 2, performanceScore: 95, status: 'approved' },
      { supplierId: 'expensive-slow-poor', unitPrice: 50, leadTimeDays: 20, performanceScore: 40, status: 'approved' },
    ];
    const top = recommendSupplierForItem(candidates);
    expect(top.supplierId).toBe('cheap-fast-good');
  });

  it('gives every candidate 100 on a metric when they all tie on it', () => {
    const candidates = [
      { supplierId: 'a', unitPrice: 10, leadTimeDays: 5, performanceScore: 70, status: 'approved' },
      { supplierId: 'b', unitPrice: 10, leadTimeDays: 5, performanceScore: 90, status: 'approved' },
    ];
    const ranked = rankSuppliersForItem(candidates);
    expect(ranked[0].priceScore).toBe(100);
    expect(ranked[0].leadTimeScore).toBe(100);
    // price/lead time tied -> performance score alone decides the winner
    expect(ranked[0].supplierId).toBe('b');
  });
});
