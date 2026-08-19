import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { readonlyClient } from '../apiClient.js';

const scenarioSchema = z.object({
  avgDailyDemand: z.number().min(0).describe('Average units demanded per day'),
  leadTimeDays: z.number().min(0).describe('Supplier lead time in days'),
  demandStdDev: z.number().min(0).optional().describe('Standard deviation of daily demand'),
  safetyStock: z.number().min(0).optional(),
  // A z.union of numeric literals renders as a `type: STRING` schema for the
  // Gemini function-calling API (an ADK/zod-to-schema conversion bug), which
  // Gemini then rejects outright since the enum values are numbers - so this
  // is a plain number instead; the backend already validates it's one of
  // 90/95/99 (see algorithmValidators.js) and reports a normal error if not.
  serviceLevel: z.number().optional().describe('Target service level - must be 90, 95, or 99'),
  orderingCost: z.number().min(0).optional(),
  holdingCostPerUnit: z.number().min(0).optional(),
});

const runRopEoqTool = new FunctionTool({
  name: 'run_rop_eoq',
  description:
    'Computes the reorder point (simple and probabilistic) and economic order quantity for a demand/cost scenario, without needing a saved item.',
  parameters: scenarioSchema,
  execute: async (input) => {
    const result = await readonlyClient.post('/algorithms/rop-eoq-scenario', input);
    return { status: 'success', ...result };
  },
});

const runWhatIfScenariosTool = new FunctionTool({
  name: 'run_what_if_scenarios',
  description:
    'Runs the ROP/EOQ calculation across multiple demand scenarios at once, to compare an inventory policy under different conditions (e.g. optimistic vs pessimistic demand, faster vs slower supplier lead time).',
  parameters: z.object({ scenarios: z.array(scenarioSchema).min(1).max(10) }),
  execute: async ({ scenarios }) => {
    const results = await Promise.all(scenarios.map((scenario) => readonlyClient.post('/algorithms/rop-eoq-scenario', scenario)));
    return {
      status: 'success',
      comparisons: scenarios.map((scenario, i) => ({ scenario, result: results[i] })),
    };
  },
});

export const advisoryTools = [runRopEoqTool, runWhatIfScenariosTool];
