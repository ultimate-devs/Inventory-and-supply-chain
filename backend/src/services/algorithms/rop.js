// Z-scores for one-sided service levels, used by the probabilistic ROP model.
export const SERVICE_LEVEL_Z = { 90: 1.2816, 95: 1.6449, 99: 2.3263 };

const clampNonNegative = (n) => Math.max(0, Number(n) || 0);

/**
 * Simple reorder point: ROP = (average daily demand x lead time) + safety stock.
 */
export const calculateROPSimple = ({ avgDailyDemand, leadTimeDays, safetyStock = 0 }) => {
  const demand = clampNonNegative(avgDailyDemand);
  const leadTime = clampNonNegative(leadTimeDays);
  const safety = clampNonNegative(safetyStock);
  return demand * leadTime + safety;
};

/**
 * Probabilistic reorder point accounting for demand variability:
 * ROP = (average daily demand x lead time) + Z x demand std-dev x sqrt(lead time)
 */
export const calculateROPProbabilistic = ({
  avgDailyDemand,
  leadTimeDays,
  demandStdDev = 0,
  serviceLevel = 95,
}) => {
  const demand = clampNonNegative(avgDailyDemand);
  const leadTime = clampNonNegative(leadTimeDays);
  const stdDev = clampNonNegative(demandStdDev);
  const z = SERVICE_LEVEL_Z[serviceLevel] ?? SERVICE_LEVEL_Z[95];

  const baseDemand = demand * leadTime;
  const safetyStock = z * stdDev * Math.sqrt(leadTime);

  return baseDemand + safetyStock;
};
