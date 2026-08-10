import { readonlyClient, procurementClient } from './apiClient.js';
import { AGENT_TYPES } from './constants.js';

const clientForAgent = (agentType) => (agentType === AGENT_TYPES.PROCUREMENT ? procurementClient : readonlyClient);

/**
 * Records one agent run's output via POST /api/v1/agent-logs, so it's
 * traceable in the same audit trail as every human action (see
 * backend/src/models/AgentLog.js). `relatedModel`/`relatedId` should point at
 * the specific record the summary is about whenever there is one.
 */
export const recordAgentLog = ({ agentType, action, summary, relatedModel, relatedId, triggeredBy }) =>
  clientForAgent(agentType).post('/agent-logs', { agentType, action, summary, relatedModel, relatedId, triggeredBy });
