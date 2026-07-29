// Computes average daily demand and (population) standard deviation from a
// history of { date, quantity } entries. Pure function - no I/O.
export const computeDemandStats = (dailyDemandHistory = []) => {
  const quantities = dailyDemandHistory.map((entry) => Math.max(0, Number(entry.quantity) || 0));

  if (quantities.length === 0) {
    return { avgDailyDemand: 0, demandStdDev: 0 };
  }

  const avgDailyDemand = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;

  const variance =
    quantities.reduce((sum, q) => sum + (q - avgDailyDemand) ** 2, 0) / quantities.length;

  return { avgDailyDemand, demandStdDev: Math.sqrt(variance) };
};
