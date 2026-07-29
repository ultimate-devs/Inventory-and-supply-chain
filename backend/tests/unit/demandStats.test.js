import { computeDemandStats } from '../../src/services/algorithms/demandStats.js';

describe('computeDemandStats', () => {
  it('returns zeros for empty history', () => {
    expect(computeDemandStats([])).toEqual({ avgDailyDemand: 0, demandStdDev: 0 });
  });

  it('returns zero std-dev when demand is constant', () => {
    const history = Array.from({ length: 5 }, () => ({ date: new Date(), quantity: 10 }));
    const result = computeDemandStats(history);
    expect(result.avgDailyDemand).toBe(10);
    expect(result.demandStdDev).toBe(0);
  });

  it('computes average and population std-dev for varying demand', () => {
    const history = [2, 4, 4, 4, 5, 5, 7, 9].map((quantity) => ({ date: new Date(), quantity }));
    const result = computeDemandStats(history);
    expect(result.avgDailyDemand).toBe(5);
    expect(result.demandStdDev).toBeCloseTo(2, 5);
  });

  it('clamps negative quantities to zero rather than skewing the average negative', () => {
    const history = [{ date: new Date(), quantity: -5 }, { date: new Date(), quantity: 10 }];
    const result = computeDemandStats(history);
    expect(result.avgDailyDemand).toBe(5);
  });
});
