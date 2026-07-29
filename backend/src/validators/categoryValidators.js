import { body } from 'express-validator';

export const createCategoryValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
];

export const updateCategoryValidators = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
];
