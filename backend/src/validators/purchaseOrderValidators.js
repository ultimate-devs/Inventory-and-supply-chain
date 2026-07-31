import { body } from 'express-validator';

const lineValidators = [
  body('lines').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lines.*.item').isMongoId().withMessage('Each line requires a valid item id'),
  body('lines.*.quantity').isInt({ min: 1 }).withMessage('Each line quantity must be a positive integer'),
  body('lines.*.unitPrice').isFloat({ min: 0 }).withMessage('Each line unit price must be a non-negative number'),
];

export const createPurchaseOrderValidators = [
  body('supplier').isMongoId().withMessage('A valid supplier id is required'),
  ...lineValidators,
  body('expectedDeliveryDate').optional().isISO8601().withMessage('Invalid expected delivery date'),
  body('recommendedSupplier').optional().isBoolean(),
];

export const updateDraftPurchaseOrderValidators = [
  body('lines').optional().isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lines.*.item').optional().isMongoId().withMessage('Each line requires a valid item id'),
  body('lines.*.quantity').optional().isInt({ min: 1 }).withMessage('Each line quantity must be a positive integer'),
  body('lines.*.unitPrice').optional().isFloat({ min: 0 }).withMessage('Each line unit price must be a non-negative number'),
  body('expectedDeliveryDate').optional().isISO8601().withMessage('Invalid expected delivery date'),
];

export const versionOnlyValidators = [body('version').isInt({ min: 0 }).withMessage('A valid version is required')];

export const decisionValidators = [
  body('version').isInt({ min: 0 }).withMessage('A valid version is required'),
  body('note').optional().trim().isLength({ max: 300 }),
];

export const receiveGoodsValidators = [
  body('version').isInt({ min: 0 }).withMessage('A valid version is required'),
  body('lines').isArray({ min: 1 }).withMessage('At least one received line is required'),
  body('lines.*.item').isMongoId().withMessage('Each received line requires a valid item id'),
  body('lines.*.receivedQuantity')
    .isInt({ min: 0 })
    .withMessage('Each received quantity must be a non-negative integer'),
];
