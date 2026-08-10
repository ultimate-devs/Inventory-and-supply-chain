// Mirrors backend/src/models/AgentLog.js's enums - kept in sync manually
// since these two services don't share a package.

export const AGENT_TYPES = Object.freeze({
  MONITORING: 'monitoring',
  ADVISORY: 'advisory',
  ANALYTICS: 'analytics',
  PROCUREMENT: 'procurement',
});

export const AGENT_LOG_TRIGGER = Object.freeze({
  CRON: 'cron',
  MANUAL: 'manual',
});
