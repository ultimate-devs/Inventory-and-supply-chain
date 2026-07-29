import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { updateUserValidators } from '../validators/userValidators.js';
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
