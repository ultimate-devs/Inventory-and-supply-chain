import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { createUserValidators, updateUserValidators } from '../validators/userValidators.js';
import { ROLES } from '../config/roles.js';

const router = Router();

router.use(protect, authorize(ROLES.SUPER_ADMIN));

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List users (Super Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Users retrieved }
 */
router.get('/', userController.listUsers);

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a user (Super Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: User created }
 */
router.post('/', writeLimiter, createUserValidators, validate, userController.createUser);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a user by id (Super Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User retrieved }
 */
router.get('/:id', userController.getUser);

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Update a user's name/role/active status (Super Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User updated }
 */
router.put('/:id', writeLimiter, updateUserValidators, validate, userController.updateUser);

/**
 * @openapi
 * /users/{id}/reset-password:
 *   post:
 *     summary: Generate a new temporary password for a user and email it to them (Super Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Temporary password generated and emailed }
 */
router.post('/:id/reset-password', writeLimiter, userController.resetUserPassword);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Deactivate (soft delete) a user (Super Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User deactivated }
 */
router.delete('/:id', writeLimiter, userController.deactivateUser);

export default router;
