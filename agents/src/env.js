import dotenv from 'dotenv';

dotenv.config();

const required = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  // Each agent authenticates to Gemini with its own API key/account so the
  // four agents don't share a single free-tier quota (20 requests/min) -
  // Monitoring keeps the original var since it's the lowest-traffic agent
  // now that it's manual-trigger-only (see below); the other three fall
  // back to it too if their own key isn't set, so a partial rollout still
  // works, just with shared quota for whichever ones aren't configured yet.
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiApiKeyAdvisory: process.env.GEMINI_API_KEY_ADVISORY || process.env.GEMINI_API_KEY || '',
  geminiApiKeyAnalytics: process.env.GEMINI_API_KEY_ANALYTICS || process.env.GEMINI_API_KEY || '',
  geminiApiKeyProcurement: process.env.GEMINI_API_KEY_PROCUREMENT || process.env.GEMINI_API_KEY || '',
  apiBaseUrl: required('API_BASE_URL', 'http://localhost:5000/api/v1'),
  agentsReadonly: {
    email: required('AGENTS_READONLY_EMAIL', 'agents-readonly@internal.local'),
    password: process.env.AGENTS_READONLY_PASSWORD || '',
  },
  agentsProcurement: {
    email: required('AGENTS_PROCUREMENT_EMAIL', 'agents-procurement@internal.local'),
    password: process.env.AGENTS_PROCUREMENT_PASSWORD || '',
  },
  // Shared secret this service's own HTTP API (POST /run/*) requires on every
  // caller via the `x-internal-api-key` header - without it, anyone who can
  // reach this port could trigger the Procurement agent to draft/submit real
  // purchase orders, or the Analytics/Advisory agents to read internal
  // reports, using the agents service's own privileged backend credentials.
  // Left unset (not defaulted) so a missing key fails closed rather than
  // silently accepting unauthenticated requests.
  internalApiKey: process.env.AGENTS_INTERNAL_API_KEY || '',
};
