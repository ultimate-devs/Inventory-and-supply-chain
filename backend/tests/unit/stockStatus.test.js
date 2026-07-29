import { classifyStockStatus, STOCK_STATUS } from '../../src/services/algorithms/stockStatus.js';

describe('classifyStockStatus', () => {
  it('classifies zero stock as critical', () => {
    expect(classifyStockStatus({ currentStock: 0, reorderPoint: 50, safetyStock: 10 })).toBe(STOCK_STATUS.CRITICAL);
  });

  it('classifies stock exactly at safety stock as critical (boundary)', () => {
    expect(classifyStockStatus({ currentStock: 10, reorderPoint: 50, safetyStock: 10 })).toBe(STOCK_STATUS.CRITICAL);
  });

  it('classifies stock just above safety stock but below ROP as low', () => {
    expect(classifyStockStatus({ currentStock: 11, reorderPoint: 50, safetyStock: 10 })).toBe(STOCK_STATUS.LOW);
  });

  it('classifies stock exactly at the reorder point as low (boundary)', () => {
    expect(classifyStockStatus({ currentStock: 50, reorderPoint: 50, safetyStock: 10 })).toBe(STOCK_STATUS.LOW);
  });

  it('classifies stock between ROP and the excess threshold as ok', () => {
    expect(classifyStockStatus({ currentStock: 51, reorderPoint: 50, safetyStock: 10, excessMultiplier: 3 })).toBe(
      STOCK_STATUS.OK,
    );
  });

  it('classifies stock exactly at the excess threshold as ok (boundary, not yet excess)', () => {
    expect(classifyStockStatus({ currentStock: 150, reorderPoint: 50, safetyStock: 10, excessMultiplier: 3 })).toBe(
      STOCK_STATUS.OK,
    );
  });

  it('classifies stock just above the excess threshold as excess', () => {
    expect(classifyStockStatus({ currentStock: 151, reorderPoint: 50, safetyStock: 10, excessMultiplier: 3 })).toBe(
      STOCK_STATUS.EXCESS,
    );
  });

  it('treats a zero reorder point (no demand yet) as ok rather than excess, above safety stock', () => {
    expect(classifyStockStatus({ currentStock: 1000, reorderPoint: 0, safetyStock: 0 })).toBe(STOCK_STATUS.OK);
  });

  it('never returns excess when the multiplier is below 1 (clamped to 1)', () => {
    const result = classifyStockStatus({ currentStock: 60, reorderPoint: 50, safetyStock: 10, excessMultiplier: 0.5 });
    expect(result).toBe(STOCK_STATUS.EXCESS);
  });
});
