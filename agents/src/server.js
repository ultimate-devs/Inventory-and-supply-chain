import express from 'express';
import cron from 'node-cron';
import { timingSafeEqual } from 'node:crypto';
import { env } from './env.js';
import { runAgentOnce } from './runAgent.js';
import { recordAgentLog } from './agentLogClient.js';
import { AGENT_TYPES, AGENT_LOG_TRIGGER } from './constants.js';
import { monitoringAgent } from './agents/monitoringAgent.js';
import { advisoryAgent } from './agents/advisoryAgent.js';
import { analyticsAgent } from './agents/analyticsAgent.js';
import { procurementAgent } from './agents/procurementAgent.js';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Every /run/* route drives a Gemini agent that acts through this service's
 * own privileged backend service-account credentials (draft/submit real
 * purchase orders, read internal reports) - unlike the backend API, there is
 * no per-caller identity to authorize here, just "is this caller trusted to
 * invoke this service at all". A single shared secret, compared in constant
 * time, is enough to keep it out of reach of anyone who merely has network
 * access to the port. Fails closed: an unset server-side key rejects every
 * request rather than accepting them unauthenticated.
 */
const requireInternalApiKey = (req, res, next) => {
  const expected = env.internalApiKey;
  const provided = req.get('x-internal-api-key') ?? '';
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  const valid = expectedBuf.length > 0 && expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);
  if (!valid) return res.status(401).json({ message: 'Invalid or missing internal API key' });
  next();
};

/**
 * Runs one agent for a single request, logs its output to the backend's
 * AgentLog, and returns the narrative. `action` and `relatedModel`/`relatedId`
 * describe what this particular run was about, for traceability.
 */
const runAndLog = async ({ agentType, agent, message, action, relatedModel, relatedId, triggeredBy }) => {
  const summary = await runAgentOnce(agent, message);
  const log = await recordAgentLog({ agentType, action, summary, relatedModel, relatedId, triggeredBy });
  return { summary, log };
};

app.post('/run/advisory', requireInternalApiKey, async (req, res, next) => {
  try {
    const { message, action = 'scenario_review', relatedModel, relatedId } = req.body ?? {};
    if (!message) return res.status(400).json({ message: 'message is required' });

    const result = await runAndLog({
      agentType: AGENT_TYPES.ADVISORY,
      agent: advisoryAgent,
      message,
      action,
      relatedModel,
      relatedId,
      triggeredBy: AGENT_LOG_TRIGGER.MANUAL,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/run/analytics', requireInternalApiKey, async (req, res, next) => {
  try {
    const { message, action = 'report_review', relatedModel, relatedId } = req.body ?? {};
    if (!message) return res.status(400).json({ message: 'message is required' });

    const result = await runAndLog({
      agentType: AGENT_TYPES.ANALYTICS,
      agent: analyticsAgent,
      message,
      action,
      relatedModel,
      relatedId,
      triggeredBy: AGENT_LOG_TRIGGER.MANUAL,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/run/procurement', requireInternalApiKey, async (req, res, next) => {
  try {
    const { message, action = 'supplier_review', relatedModel, relatedId } = req.body ?? {};
    if (!message) return res.status(400).json({ message: 'message is required' });

    const result = await runAndLog({
      agentType: AGENT_TYPES.PROCUREMENT,
      agent: procurementAgent,
      message,
      action,
      relatedModel,
      relatedId,
      triggeredBy: AGENT_LOG_TRIGGER.MANUAL,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message ?? 'Agent run failed' });
});

const runMonitoringSweep = async () => {
  try {
    await runAndLog({
      agentType: AGENT_TYPES.MONITORING,
      agent: monitoringAgent,
      message: 'Review current inventory and purchase-order health and report anything that needs attention.',
      action: 'periodic_review',
      triggeredBy: AGENT_LOG_TRIGGER.CRON,
    });
  } catch (err) {
    console.error('Monitoring sweep failed:', err);
  }
};

if (env.nodeEnv !== 'test') {
  cron.schedule(env.monitoringCronSchedule, runMonitoringSweep);

  app.listen(env.port, () => {
    console.log(`Agents service listening on port ${env.port}`);
    console.log(`Monitoring agent scheduled: ${env.monitoringCronSchedule}`);
  });
}

export { app, runMonitoringSweep };
