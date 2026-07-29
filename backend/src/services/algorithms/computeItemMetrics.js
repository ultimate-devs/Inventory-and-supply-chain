import { computeDemandStats } from './demandStats.js';
import { calculateROPSimple, calculateROPProbabilistic } from './rop.js';
import { calculateEOQ } from './eoq.js';
import { classifyStockStatus } from './stockStatus.js';

/**
 * Pure computation of an item's cached metrics from its raw fields. Takes a
 * plain object (works for both Mongoose documents and plain data) and
 * returns the fields to assign - it never touches the database, so it has
 * no circular dependency on the Item model and is trivial to unit test.
 */
export const computeItemMetrics = (
  { dailyDemandHistory, leadTimeDays, safetyStock, serviceLevel, orderingCost, holdingCostPerUnit, currentStock },
  { excessStockMultiplier = 3 } = {},
) => {
  const { avgDailyDemand, demandStdDev } = computeDemandStats(dailyDemandHistory);

  const reorderPointSimple = calculateROPSimple({ avgDailyDemand, leadTimeDays, safetyStock });

  const reorderPointProbabilistic = calculateROPProbabilistic({
    avgDailyDemand,
    leadTimeDays,
    demandStdDev,
    serviceLevel,
  });

  const economicOrderQuantity = calculateEOQ({
    annualDemand: avgDailyDemand * 365,
    orderingCost,
    holdingCostPerUnit,
  });

  const stockStatus = classifyStockStatus({
    currentStock,
    reorderPoint: reorderPointProbabilistic || reorderPointSimple,
    safetyStock,
    excessMultiplier: excessStockMultiplier,
  });

  return {
    avgDailyDemand,
    demandStdDev,
    reorderPointSimple,
    reorderPointProbabilistic,
    economicOrderQuantity,
    stockStatus,
    lastCalculatedAt: new Date(),
  };
};
