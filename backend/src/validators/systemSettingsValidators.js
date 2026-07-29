import { body } from 'express-validator';

export const updateSettingsValidators = [
  body('companyName').optional().trim().isLength({ min: 1, max: 150 }),
  body('currency').optional().isLength({ min: 3, max: 3 }),
  body('defaultBudget').optional().isFloat({ min: 0 }),
  body('lowStockThresholdPercent').optional().isFloat({ min: 0, max: 100 }),
  body('criticalStockThresholdPercent').optional().isFloat({ min: 0, max: 100 }),
  body('excessStockMultiplier').optional().isFloat({ min: 1 }),
  body('defaultServiceLevel').optional().isIn([90, 95, 99]),
];
