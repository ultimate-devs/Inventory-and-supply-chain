import { body } from 'express-validator';

export const allocationValidators = [
  body('budget').isFloat({ min: 0 }).withMessage('Budget must be a non-negative number'),
  body('items').optional().isArray().withMessage('Items must be an array of item ids'),
  body('items.*').optional().isMongoId().withMessage('Each item id must be valid'),
];

export const ropEoqScenarioValidators = [
  body('avgDailyDemand').isFloat({ min: 0 }).withMessage('avgDailyDemand must be a non-negative number'),
  body('leadTimeDays').isFloat({ min: 0 }).withMessage('leadTimeDays must be a non-negative number'),
  body('demandStdDev').optional().isFloat({ min: 0 }),
  body('safetyStock').optional().isFloat({ min: 0 }),
  body('serviceLevel').optional().isIn([90, 95, 99]),
  body('orderingCost').optional().isFloat({ min: 0 }),
  body('holdingCostPerUnit').optional().isFloat({ min: 0 }),
];
