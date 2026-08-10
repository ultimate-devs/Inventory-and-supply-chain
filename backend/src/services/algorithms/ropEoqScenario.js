import { calculateROPSimple, calculateROPProbabilistic } from './rop.js';
import { calculateEOQ } from './eoq.js';

// Stateless what-if wrapper around the existing ROP/EOQ formulas, for
// scenarios that aren't tied to a saved Item (e.g. the Advisory agent
// exploring hypothetical demand conditions). No new math - just lets a
// caller supply raw inputs directly instead of requiring an Item document.
// Pure function - no I/O.
export const runRopEoqScenario = ({
  avgDailyDemand,
  leadTimeDays,
  demandStdDev = 0,
  safetyStock = 0,
  serviceLevel = 95,
  orderingCost = 0,
  holdingCostPerUnit = 0,
}) => {
  const reorderPointSimple = calculateROPSimple({ avgDailyDemand, leadTimeDays, safetyStock });
  const reorderPointProbabilistic = calculateROPProbabilistic({
    avgDailyDemand,
    leadTimeDays,
    demandStdDev,
    serviceLevel,
  });
  const economicOrderQuantity = calculateEOQ({
    annualDemand: (Number(avgDailyDemand) || 0) * 365,
    orderingCost,
    holdingCostPerUnit,
  });

  return { reorderPointSimple, reorderPointProbabilistic, economicOrderQuantity };
};
