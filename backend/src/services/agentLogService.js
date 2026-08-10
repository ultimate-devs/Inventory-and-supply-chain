import { AgentLog } from '../models/AgentLog.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';

export const createAgentLog = async (data, createdBy) =>
  AgentLog.create({
    agentType: data.agentType,
    action: data.action,
    summary: data.summary,
    relatedModel: data.relatedModel,
    relatedId: data.relatedId,
    triggeredBy: data.triggeredBy,
    createdBy,
  });

export const listAgentLogs = async (query) => {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });
  const filter = {};
  if (query.agentType) filter.agentType = query.agentType;

  const [logs, total] = await Promise.all([
    AgentLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email isServiceAccount'),
    AgentLog.countDocuments(filter),
  ]);

  return { logs, meta: buildMeta({ page, limit, total }) };
};
