import type { AgentLog, AgentType } from './agentLog';

export interface AgentRunPayload {
  message: string;
  action?: string;
  relatedModel?: string;
  relatedId?: string;
}

export interface AgentRunResult {
  summary: string;
  log: AgentLog;
}

export type { AgentType };
