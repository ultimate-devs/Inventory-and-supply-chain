import * as alertService from '../services/alertService.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';
import { recordAuditEvent } from '../middleware/auditLog.js';

export const list = asyncHandler(async (req, res) => {
  const { alerts, meta } = await alertService.listAlerts(req.query);
  sendResponse(res, 200, { data: alerts, message: 'Alerts retrieved', meta });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const count = await alertService.getUnreadCount();
  sendResponse(res, 200, { data: { count }, message: 'Unread alert count retrieved' });
});

export const acknowledge = asyncHandler(async (req, res) => {
  const alert = await alertService.acknowledgeAlert(req.params.id, req.user.id);
  await recordAuditEvent({ actor: req.user.id, action: 'alert.acknowledge', target: alert._id.toString(), ip: req.ip });
  sendResponse(res, 200, { data: alert, message: 'Alert acknowledged' });
});

export const resolve = asyncHandler(async (req, res) => {
  const alert = await alertService.resolveAlert(req.params.id, req.user.id);
  await recordAuditEvent({ actor: req.user.id, action: 'alert.resolve', target: alert._id.toString(), ip: req.ip });
  sendResponse(res, 200, { data: alert, message: 'Alert resolved' });
});
