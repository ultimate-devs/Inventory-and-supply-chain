import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Mirrors the /run/* routes exposed by agents/src/server.js.
const AGENT_RUN_PATHS = {
  monitoring: '/run/monitoring',
  advisory: '/run/advisory',
  analytics: '/run/analytics',
  procurement: '/run/procurement',
};

export const AGENT_RUN_TYPES = Object.keys(AGENT_RUN_PATHS);

// Proxies a user-triggered agent run to the agents service, attaching the
// shared internal API key server-side so it never reaches the browser. The
// agents service logs the run to AgentLog itself (via its own service
// account), so the only thing we need to hand back is its response.
export const runAgent = async ({ agentType, message, action, relatedModel, relatedId }) => {
  const path = AGENT_RUN_PATHS[agentType];
  if (!path) {
    throw ApiError.badRequest(`Unknown agent type: ${agentType}`);
  }

  let response;
  try {
    response = await fetch(`${env.agents.serviceUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-api-key': env.agents.internalApiKey },
      body: JSON.stringify({ message, action, relatedModel, relatedId }),
    });
  } catch (err) {
    throw new ApiError(502, `Unable to reach the agents service: ${err.message}`);
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status >= 400 ? response.status : 502, body.message || 'Agent run failed');
  }

  return body;
};
