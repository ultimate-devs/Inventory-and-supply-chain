import * as agentLogService from '../services/agentLogService.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';
import { recordAuditEvent } from '../middleware/auditLog.js';

export const create = asyncHandler(async (req, res) => {
  const log = await agentLogService.createAgentLog(req.body, req.user.id);
  await recordAuditEvent({
    actor: req.user.id,
    action: `agent.${log.agentType}.${log.action}`,
    target: log.relatedId?.toString(),
    ip: req.ip,
  });
  sendResponse(res, 201, { data: log, message: 'Agent log recorded' });
});

export const list = asyncHandler(async (req, res) => {
  const { logs, meta } = await agentLogService.listAgentLogs(req.query);
  sendResponse(res, 200, { data: logs, message: 'Agent logs retrieved', meta });
});
