import { body } from 'express-validator';

const passwordRule = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/\d/)
  .withMessage('Password must contain a number');

// Deliberately no `role` field: public registration always gets the default,
// least-privileged role (see authService.registerUser). Role changes go
// through the admin-only PUT /users/:id endpoint.
export const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  passwordRule,
];

export const loginValidators = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidators = [body('email').isEmail().withMessage('A valid email is required').normalizeEmail()];

export const resetPasswordValidators = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
];
