import { calculateROPSimple, calculateROPProbabilistic, SERVICE_LEVEL_Z } from '../../src/services/algorithms/rop.js';

describe('calculateROPSimple', () => {
  it('computes demand-during-lead-time plus safety stock', () => {
    expect(calculateROPSimple({ avgDailyDemand: 10, leadTimeDays: 5, safetyStock: 20 })).toBe(70);
  });

  it('returns 0 for zero demand, zero lead time, and zero safety stock', () => {
    expect(calculateROPSimple({ avgDailyDemand: 0, leadTimeDays: 0, safetyStock: 0 })).toBe(0);
  });

  it('defaults safety stock to 0 when omitted', () => {
    expect(calculateROPSimple({ avgDailyDemand: 3, leadTimeDays: 4 })).toBe(12);
  });

  it('clamps negative inputs to zero instead of producing a negative ROP', () => {
    expect(calculateROPSimple({ avgDailyDemand: -5, leadTimeDays: 10, safetyStock: -2 })).toBe(0);
  });

  it('handles extreme values without overflowing', () => {
    const result = calculateROPSimple({ avgDailyDemand: 1_000_000, leadTimeDays: 365, safetyStock: 0 });
    expect(result).toBe(365_000_000);
  });
});

describe('calculateROPProbabilistic', () => {
  it('adds a Z-scaled safety buffer on top of demand during lead time', () => {
    const result = calculateROPProbabilistic({
      avgDailyDemand: 10,
      leadTimeDays: 4,
      demandStdDev: 2,
      serviceLevel: 95,
    });
    // 10*4 + 1.6449 * 2 * sqrt(4) = 40 + 6.5796
    expect(result).toBeCloseTo(46.5796, 3);
  });

  it('collapses to the simple base demand when there is no variability', () => {
    const result = calculateROPProbabilistic({ avgDailyDemand: 10, leadTimeDays: 4, demandStdDev: 0 });
    expect(result).toBe(40);
  });

  it('returns 0 when lead time is 0 regardless of variability', () => {
    const result = calculateROPProbabilistic({ avgDailyDemand: 10, leadTimeDays: 0, demandStdDev: 5 });
    expect(result).toBe(0);
  });

  it('falls back to the 95% Z-score for an unrecognised service level', () => {
    const withUnknown = calculateROPProbabilistic({
      avgDailyDemand: 5,
      leadTimeDays: 9,
      demandStdDev: 1,
      serviceLevel: 42,
    });
    const with95 = calculateROPProbabilistic({
      avgDailyDemand: 5,
      leadTimeDays: 9,
      demandStdDev: 1,
      serviceLevel: 95,
    });
    expect(withUnknown).toBe(with95);
  });

  it.each([90, 95, 99])('uses the correct Z-score for the %i%% service level', (level) => {
    const result = calculateROPProbabilistic({ avgDailyDemand: 0, leadTimeDays: 1, demandStdDev: 1, serviceLevel: level });
    expect(result).toBeCloseTo(SERVICE_LEVEL_Z[level], 5);
  });
});
