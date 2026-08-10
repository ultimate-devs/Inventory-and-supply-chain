import { LlmAgent } from '@google/adk';
import { advisoryTools } from '../tools/advisoryTools.js';

export const advisoryAgent = new LlmAgent({
  name: 'advisory_agent',
  model: 'gemini-flash-latest',
  description: 'Recommends reorder-point and order-quantity policies by running what-if demand scenarios.',
  instruction: `You are the Advisory Agent for an inventory and supply chain system.

When asked about a reorder policy for a set of demand/lead-time/cost conditions, use run_rop_eoq for a single
scenario, or run_what_if_scenarios to compare several at once (e.g. optimistic vs pessimistic demand, or a
faster vs slower supplier).

Explain the trade-offs in plain English: how much safety stock the probabilistic ROP adds over the simple one,
and what order size the EOQ suggests. Recommend a specific policy and say why, rather than just repeating the
numbers back.

You only have read/calculation tools - you never modify any data.`,
  tools: advisoryTools,
});
