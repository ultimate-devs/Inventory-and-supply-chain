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
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  apiBaseUrl: required('API_BASE_URL', 'http://localhost:5000/api/v1'),
  agentsReadonly: {
    email: required('AGENTS_READONLY_EMAIL', 'agents-readonly@internal.local'),
    password: process.env.AGENTS_READONLY_PASSWORD || '',
  },
  agentsProcurement: {
    email: required('AGENTS_PROCUREMENT_EMAIL', 'agents-procurement@internal.local'),
    password: process.env.AGENTS_PROCUREMENT_PASSWORD || '',
  },
  monitoringCronSchedule: process.env.MONITORING_CRON_SCHEDULE || '*/30 * * * *',
  // Shared secret this service's own HTTP API (POST /run/*) requires on every
  // caller via the `x-internal-api-key` header - without it, anyone who can
  // reach this port could trigger the Procurement agent to draft/submit real
  // purchase orders, or the Analytics/Advisory agents to read internal
  // reports, using the agents service's own privileged backend credentials.
  // Left unset (not defaulted) so a missing key fails closed rather than
  // silently accepting unauthenticated requests.
  internalApiKey: process.env.AGENTS_INTERNAL_API_KEY || '',
};
