import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import {
  registerValidators,
  loginValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
} from '../validators/authValidators.js';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Account created }
 */
router.post('/register', authLimiter, registerValidators, validate, authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in and receive an access token (refresh token set as httpOnly cookie)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Signed in }
 */
router.post('/login', authLimiter, loginValidators, validate, authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Exchange the refresh-token cookie for a new access token (rotates the refresh token)
 *     tags: [Auth]
 *     responses:
 *       200: { description: Session refreshed }
 */
router.post('/refresh', authLimiter, authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Invalidate the current refresh token
 *     tags: [Auth]
 *     responses:
 *       200: { description: Signed out }
 */
router.post('/logout', protect, authController.logout);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset token
 *     tags: [Auth]
 *     responses:
 *       200: { description: Reset requested }
 */
router.post('/forgot-password', authLimiter, forgotPasswordValidators, validate, authController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using a reset token
 *     tags: [Auth]
 *     responses:
 *       200: { description: Password reset }
 */
router.post('/reset-password', authLimiter, resetPasswordValidators, validate, authController.resetPasswordHandler);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 */
router.get('/me', protect, authController.me);

export default router;
