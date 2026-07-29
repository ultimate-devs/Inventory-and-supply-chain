/**
 * Economic Order Quantity, Wilson formula: EOQ = sqrt((2 x D x S) / H)
 * D = annual demand, S = ordering cost per order, H = annual holding cost per unit.
 *
 * Returns 0 when there is no demand or no meaningful holding cost, rather than
 * throwing, since callers recalculate this on every stock change and a
 * not-yet-configured item shouldn't blow up the whole recalculation pass.
 */
export const calculateEOQ = ({ annualDemand, orderingCost, holdingCostPerUnit }) => {
  const demand = Math.max(0, Number(annualDemand) || 0);
  const orderCost = Math.max(0, Number(orderingCost) || 0);
  const holdingCost = Math.max(0, Number(holdingCostPerUnit) || 0);

  if (demand === 0 || orderCost === 0 || holdingCost === 0) {
    return 0;
  }

  return Math.sqrt((2 * demand * orderCost) / holdingCost);
};
