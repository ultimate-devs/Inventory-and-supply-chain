// Pure functions for the four weighted supplier performance metrics. Never
// touch the database - callers (grnService) read/write the Supplier's
// `stats` subdocument and call these to turn it into scores.

export const SCORE_WEIGHTS = Object.freeze({
  onTime: 0.3,
  accuracy: 0.3,
  leadTime: 0.2,
  price: 0.2,
});

const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));

export const computeOnTimeRate = ({ totalDeliveries = 0, onTimeDeliveries = 0 } = {}) => {
  if (totalDeliveries <= 0) return 100;
  return clamp((onTimeDeliveries / totalDeliveries) * 100);
};

export const computeAccuracyRate = ({ totalReceivedLines = 0, accurateReceivedLines = 0 } = {}) => {
  if (totalReceivedLines <= 0) return 100;
  return clamp((accurateReceivedLines / totalReceivedLines) * 100);
};

// Average absolute lead-time deviation (actual - quoted, in days) is mapped
// onto a 0-100 scale, losing 10 points per day of average deviation.
export const computeLeadTimeReliability = ({ leadTimeDeviationSum = 0, leadTimeSampleCount = 0 } = {}) => {
  if (leadTimeSampleCount <= 0) return 100;
  const avgDeviation = Math.abs(leadTimeDeviationSum / leadTimeSampleCount);
  return clamp(100 - avgDeviation * 10);
};

// Average absolute price deviation (percent vs catalogue price) is mapped
// onto a 0-100 scale directly (a 1% average deviation costs 1 point).
export const computePriceConsistency = ({ priceDeviationSum = 0, priceSampleCount = 0 } = {}) => {
  if (priceSampleCount <= 0) return 100;
  const avgDeviationPercent = Math.abs(priceDeviationSum / priceSampleCount);
  return clamp(100 - avgDeviationPercent);
};

export const computeOverallScore = ({ onTimeRate, accuracyRate, leadTimeReliability, priceConsistency }) =>
  clamp(
    onTimeRate * SCORE_WEIGHTS.onTime +
      accuracyRate * SCORE_WEIGHTS.accuracy +
      leadTimeReliability * SCORE_WEIGHTS.leadTime +
      priceConsistency * SCORE_WEIGHTS.price,
  );

/**
 * Folds one goods-receipt event into a supplier's running stats and returns
 * the updated stats plus the freshly computed score breakdown. Pure - does
 * not mutate the input.
 */
export const applyReceiptToStats = (
  stats,
  { onTime, totalLines, accurateLines, leadTimeDeviationDays, priceDeviationPercent },
) => {
  const next = {
    totalDeliveries: (stats.totalDeliveries || 0) + 1,
    onTimeDeliveries: (stats.onTimeDeliveries || 0) + (onTime ? 1 : 0),
    totalReceivedLines: (stats.totalReceivedLines || 0) + totalLines,
    accurateReceivedLines: (stats.accurateReceivedLines || 0) + accurateLines,
    leadTimeDeviationSum: (stats.leadTimeDeviationSum || 0) + Math.abs(leadTimeDeviationDays),
    leadTimeSampleCount: (stats.leadTimeSampleCount || 0) + 1,
    priceDeviationSum: (stats.priceDeviationSum || 0) + Math.abs(priceDeviationPercent),
    priceSampleCount: (stats.priceSampleCount || 0) + 1,
  };

  const onTimeRate = computeOnTimeRate(next);
  const accuracyRate = computeAccuracyRate(next);
  const leadTimeReliability = computeLeadTimeReliability(next);
  const priceConsistency = computePriceConsistency(next);
  const overallScore = computeOverallScore({ onTimeRate, accuracyRate, leadTimeReliability, priceConsistency });

  return { stats: next, scores: { onTimeRate, accuracyRate, leadTimeReliability, priceConsistency, overallScore } };
};
