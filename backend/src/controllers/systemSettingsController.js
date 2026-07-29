import { SystemSettings } from '../models/SystemSettings.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';
import { recordAuditEvent } from '../middleware/auditLog.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSingleton();
  sendResponse(res, 200, { data: settings, message: 'System settings retrieved' });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSingleton();
  const editableFields = [
    'companyName',
    'currency',
    'defaultBudget',
    'lowStockThresholdPercent',
    'criticalStockThresholdPercent',
    'excessStockMultiplier',
    'defaultServiceLevel',
  ];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) settings[field] = req.body[field];
  });
  await settings.save();

  await recordAuditEvent({ actor: req.user.id, action: 'settings.update', target: 'SystemSettings', ip: req.ip });

  sendResponse(res, 200, { data: settings, message: 'System settings updated' });
});
