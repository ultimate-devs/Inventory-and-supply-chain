import { body, query } from 'express-validator';
import { SUPPLIER_STATUS } from '../models/Supplier.js';

export const createSupplierValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 150 }),
  body('contactName').optional().trim().isLength({ max: 100 }),
  body('contactEmail').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email address'),
  body('contactPhone').optional().trim().isLength({ max: 30 }),
  body('address').optional().trim().isLength({ max: 300 }),
];

export const updateSupplierValidators = [
  body('name').optional().trim().isLength({ min: 1, max: 150 }),
  body('contactName').optional().trim().isLength({ max: 100 }),
  body('contactEmail').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email address'),
  body('contactPhone').optional().trim().isLength({ max: 30 }),
  body('address').optional().trim().isLength({ max: 300 }),
];

export const statusValidators = [body('status').isIn(Object.values(SUPPLIER_STATUS)).withMessage('Invalid status')];

export const catalogueEntryValidators = [
  body('item').isMongoId().withMessage('A valid item id is required'),
  body('supplierSku').optional().trim().isLength({ max: 60 }),
  body('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
  body('leadTimeDays').isFloat({ min: 0 }).withMessage('Lead time must be a non-negative number'),
];

export const recommendQueryValidators = [query('item').isMongoId().withMessage('A valid item id is required')];
