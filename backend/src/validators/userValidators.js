import { body } from 'express-validator';
import { ALL_ROLES } from '../config/roles.js';

export const createUserValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('role').optional().isIn(ALL_ROLES).withMessage('Invalid role'),
];

export const updateUserValidators = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('role').optional().isIn(ALL_ROLES).withMessage('Invalid role'),
  body('isActive').optional().isBoolean(),
];
