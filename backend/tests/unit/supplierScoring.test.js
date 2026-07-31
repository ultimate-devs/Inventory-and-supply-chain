import {
  computeOnTimeRate,
  computeAccuracyRate,
  computeLeadTimeReliability,
  computePriceConsistency,
  computeOverallScore,
  applyReceiptToStats,
} from '../../src/services/algorithms/supplierScoring.js';

describe('supplier scoring', () => {
  it('defaults every rate to 100 for a brand new supplier with no history', () => {
    expect(computeOnTimeRate({})).toBe(100);
    expect(computeAccuracyRate({})).toBe(100);
    expect(computeLeadTimeReliability({})).toBe(100);
    expect(computePriceConsistency({})).toBe(100);
  });

  it('computes on-time rate as a percentage', () => {
    expect(computeOnTimeRate({ totalDeliveries: 4, onTimeDeliveries: 3 })).toBe(75);
  });

  it('computes accuracy rate from received line counts', () => {
    expect(computeAccuracyRate({ totalReceivedLines: 10, accurateReceivedLines: 8 })).toBe(80);
  });

  it('penalizes lead-time reliability 10 points per day of average deviation', () => {
    expect(computeLeadTimeReliability({ leadTimeDeviationSum: 20, leadTimeSampleCount: 4 })).toBe(50);
  });

  it('clamps lead-time reliability at 0 rather than going negative', () => {
    expect(computeLeadTimeReliability({ leadTimeDeviationSum: 1000, leadTimeSampleCount: 1 })).toBe(0);
  });

  it('computes price consistency from average absolute deviation percent', () => {
    expect(computePriceConsistency({ priceDeviationSum: 30, priceSampleCount: 3 })).toBe(90);
  });

  it('computes a weighted overall score from the four components', () => {
    const overall = computeOverallScore({
      onTimeRate: 100,
      accuracyRate: 100,
      leadTimeReliability: 100,
      priceConsistency: 100,
    });
    expect(overall).toBe(100);
  });

  it('folds a receipt event into stats and returns updated scores without mutating the input', () => {
    const stats = { totalDeliveries: 1, onTimeDeliveries: 1, totalReceivedLines: 2, accurateReceivedLines: 2 };
    const frozen = { ...stats };

    const { stats: nextStats, scores } = applyReceiptToStats(stats, {
      onTime: false,
      totalLines: 2,
      accurateLines: 1,
      leadTimeDeviationDays: 3,
      priceDeviationPercent: 5,
    });

    expect(stats).toEqual(frozen);
    expect(nextStats.totalDeliveries).toBe(2);
    expect(nextStats.onTimeDeliveries).toBe(1);
    expect(nextStats.totalReceivedLines).toBe(4);
    expect(nextStats.accurateReceivedLines).toBe(3);
    expect(scores.overallScore).toBeGreaterThan(0);
    expect(scores.overallScore).toBeLessThan(100);
  });
});
