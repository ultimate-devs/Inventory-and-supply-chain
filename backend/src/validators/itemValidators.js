import { body } from 'express-validator';
import { MOVEMENT_TYPES } from '../models/StockMovement.js';

export const createItemValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 150 }),
  body('sku').trim().notEmpty().withMessage('SKU is required').isLength({ max: 40 }),
  body('category').isMongoId().withMessage('A valid category id is required'),
  body('unitCost').isFloat({ min: 0 }).withMessage('Unit cost must be a non-negative number'),
  body('currentStock').optional().isFloat({ min: 0 }),
  body('leadTimeDays').optional().isFloat({ min: 0 }),
  body('orderingCost').optional().isFloat({ min: 0 }),
  body('holdingCostPerUnit').optional().isFloat({ min: 0 }),
  body('safetyStock').optional().isFloat({ min: 0 }),
  body('serviceLevel').optional().isIn([90, 95, 99]),
];

export const updateItemValidators = [
  body('name').optional().trim().isLength({ min: 1, max: 150 }),
  body('sku').optional().trim().isLength({ min: 1, max: 40 }),
  body('category').optional().isMongoId(),
  body('unitCost').optional().isFloat({ min: 0 }),
  body('leadTimeDays').optional().isFloat({ min: 0 }),
  body('orderingCost').optional().isFloat({ min: 0 }),
  body('holdingCostPerUnit').optional().isFloat({ min: 0 }),
  body('safetyStock').optional().isFloat({ min: 0 }),
  body('serviceLevel').optional().isIn([90, 95, 99]),
];

export const stockMovementValidators = [
  body('type').isIn(Object.values(MOVEMENT_TYPES)).withMessage('Invalid movement type'),
  body('quantity').isFloat().withMessage('Quantity must be a number'),
  body('reason')
    .if((value, { req }) => ['adjustment', 'damage'].includes(req.body.type))
    .trim()
    .notEmpty()
    .withMessage('A reason is required for adjustments and damage write-offs')
    .isLength({ max: 300 }),
  body('reason').optional().trim().isLength({ max: 300 }),
];

export const consumptionValidators = [
  body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be a positive number'),
  body('reason').optional().trim().isLength({ max: 300 }),
];
