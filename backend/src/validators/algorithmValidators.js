import { body } from 'express-validator';

export const allocationValidators = [
  body('budget').isFloat({ min: 0 }).withMessage('Budget must be a non-negative number'),
  body('items').optional().isArray().withMessage('Items must be an array of item ids'),
  body('items.*').optional().isMongoId().withMessage('Each item id must be valid'),
];
