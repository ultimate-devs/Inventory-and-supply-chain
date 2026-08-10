export type AgentType = 'monitoring' | 'advisory' | 'analytics' | 'procurement';
export type AgentLogTrigger = 'cron' | 'manual';

export interface AgentLog {
  _id: string;
  agentType: AgentType;
  action: string;
  summary: string;
  relatedModel?: string;
  relatedId?: string;
  triggeredBy: AgentLogTrigger;
  createdBy: { _id: string; name: string; email: string; isServiceAccount: boolean } | string;
  createdAt: string;
}

export interface AgentLogListQuery {
  page?: number;
  limit?: number;
  agentType?: AgentType;
}
