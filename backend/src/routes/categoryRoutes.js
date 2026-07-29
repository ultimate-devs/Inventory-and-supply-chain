import { Router } from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { createCategoryValidators, updateCategoryValidators } from '../validators/categoryValidators.js';
import { ROLES } from '../config/roles.js';

const router = Router();
const canWrite = authorize(ROLES.SUPER_ADMIN, ROLES.INVENTORY_MANAGER);

router.use(protect);

/**
 * @openapi
 * /categories:
 *   get:
 *     summary: List categories
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Categories retrieved }
 */
router.get('/', categoryController.list);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     summary: Get a category by id
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Category retrieved }
 */
router.get('/:id', categoryController.getOne);

/**
 * @openapi
 * /categories:
 *   post:
 *     summary: Create a category (Super Admin / Inventory Manager)
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Category created }
 */
router.post('/', canWrite, writeLimiter, createCategoryValidators, validate, categoryController.create);

/**
 * @openapi
 * /categories/{id}:
 *   put:
 *     summary: Update a category (Super Admin / Inventory Manager)
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Category updated }
 */
router.put('/:id', canWrite, writeLimiter, updateCategoryValidators, validate, categoryController.update);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     summary: Soft-delete a category (Super Admin / Inventory Manager)
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Category deleted }
 */
router.delete('/:id', canWrite, writeLimiter, categoryController.remove);

export default router;
