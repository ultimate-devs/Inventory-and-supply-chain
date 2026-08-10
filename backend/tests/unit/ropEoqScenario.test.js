import { runRopEoqScenario } from '../../src/services/algorithms/ropEoqScenario.js';

describe('runRopEoqScenario', () => {
  it('computes ROP simple, ROP probabilistic, and EOQ from raw inputs', () => {
    const result = runRopEoqScenario({
      avgDailyDemand: 10,
      leadTimeDays: 5,
      demandStdDev: 2,
      safetyStock: 20,
      serviceLevel: 95,
      orderingCost: 35,
      holdingCostPerUnit: 2,
    });

    expect(result.reorderPointSimple).toBe(70); // 10*5 + 20
    expect(result.reorderPointProbabilistic).toBeCloseTo(50 + 1.6449 * 2 * Math.sqrt(5), 3);
    // EOQ = sqrt(2 * (10*365) * 35 / 2)
    expect(result.economicOrderQuantity).toBeCloseTo(Math.sqrt((2 * 3650 * 35) / 2), 3);
  });

  it('defaults optional fields and returns zeroed results for a fully empty scenario', () => {
    const result = runRopEoqScenario({ avgDailyDemand: 0, leadTimeDays: 0 });
    expect(result.reorderPointSimple).toBe(0);
    expect(result.reorderPointProbabilistic).toBe(0);
    expect(result.economicOrderQuantity).toBe(0);
  });

  it('is not tied to any saved item - two different hypothetical scenarios produce independent results', () => {
    const low = runRopEoqScenario({ avgDailyDemand: 2, leadTimeDays: 3, orderingCost: 10, holdingCostPerUnit: 1 });
    const high = runRopEoqScenario({ avgDailyDemand: 50, leadTimeDays: 10, orderingCost: 10, holdingCostPerUnit: 1 });
    expect(high.reorderPointSimple).toBeGreaterThan(low.reorderPointSimple);
    expect(high.economicOrderQuantity).toBeGreaterThan(low.economicOrderQuantity);
  });
});
