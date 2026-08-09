import { query } from 'express-validator';

const formatValidator = query('format').optional().isIn(['csv']).withMessage('format must be csv if provided');
const dateRangeValidators = [
  query('from').optional().isISO8601().withMessage('from must be an ISO 8601 date'),
  query('to').optional().isISO8601().withMessage('to must be an ISO 8601 date'),
];

export const stockTurnoverValidators = [
  formatValidator,
  query('category').optional().isMongoId().withMessage('category must be a valid id'),
  query('days').optional().isInt({ min: 1, max: 3650 }).withMessage('days must be a positive integer'),
];

export const stockStatusBreakdownValidators = [formatValidator];

export const algorithmComparisonValidators = [
  formatValidator,
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

export const budgetUtilisationValidators = [formatValidator, ...dateRangeValidators];

export const supplierPerformanceValidators = [formatValidator];

export const purchaseOrderPipelineValidators = [formatValidator];

export const categorySpendValidators = [formatValidator, ...dateRangeValidators];
