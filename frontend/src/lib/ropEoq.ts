// Client-side port of backend/src/services/algorithms/{rop,eoq}.js, kept in
// sync deliberately (not imported - the backend is an ES module server
// package) so the ROP/EOQ calculator page can recalculate instantly as the
// user drags inputs, with no network round trip.

export const SERVICE_LEVEL_Z: Record<number, number> = { 90: 1.2816, 95: 1.6449, 99: 2.3263 };

const clampNonNegative = (n: number) => Math.max(0, Number(n) || 0);

export const calculateROPSimple = ({
  avgDailyDemand,
  leadTimeDays,
  safetyStock = 0,
}: {
  avgDailyDemand: number;
  leadTimeDays: number;
  safetyStock?: number;
}) => {
  const demand = clampNonNegative(avgDailyDemand);
  const leadTime = clampNonNegative(leadTimeDays);
  const safety = clampNonNegative(safetyStock);
  return demand * leadTime + safety;
};

export const calculateROPProbabilistic = ({
  avgDailyDemand,
  leadTimeDays,
  demandStdDev = 0,
  serviceLevel = 95,
}: {
  avgDailyDemand: number;
  leadTimeDays: number;
  demandStdDev?: number;
  serviceLevel?: number;
}) => {
  const demand = clampNonNegative(avgDailyDemand);
  const leadTime = clampNonNegative(leadTimeDays);
  const stdDev = clampNonNegative(demandStdDev);
  const z = SERVICE_LEVEL_Z[serviceLevel] ?? SERVICE_LEVEL_Z[95];

  const baseDemand = demand * leadTime;
  const safetyStock = z * stdDev * Math.sqrt(leadTime);

  return baseDemand + safetyStock;
};

export const calculateEOQ = ({
  annualDemand,
  orderingCost,
  holdingCostPerUnit,
}: {
  annualDemand: number;
  orderingCost: number;
  holdingCostPerUnit: number;
}) => {
  const demand = Math.max(0, Number(annualDemand) || 0);
  const orderCost = Math.max(0, Number(orderingCost) || 0);
  const holdingCost = Math.max(0, Number(holdingCostPerUnit) || 0);

  if (demand === 0 || orderCost === 0 || holdingCost === 0) return 0;

  return Math.sqrt((2 * demand * orderCost) / holdingCost);
};

// Multipliers used to build the 7x7 sensitivity grid, centered on the
// current value (index 3 is always the unmodified 1x value).
export const SENSITIVITY_MULTIPLIERS = [0.5, 0.7, 0.85, 1, 1.15, 1.3, 1.5];
