import { Router } from 'express';
import * as itemController from '../controllers/itemController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import {
  createItemValidators,
  updateItemValidators,
  stockMovementValidators,
  consumptionValidators,
} from '../validators/itemValidators.js';
import { ROLES } from '../config/roles.js';

const router = Router();
const canWrite = authorize(ROLES.SUPER_ADMIN, ROLES.INVENTORY_MANAGER);

router.use(protect);

/**
 * @openapi
 * /items:
 *   get:
 *     summary: List items (search, filter by category/stockStatus, paginate)
 *     tags: [Items]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Items retrieved }
 */
router.get('/', itemController.list);

/**
 * @openapi
 * /items/{id}:
 *   get:
 *     summary: Get an item by id
 *     tags: [Items]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Item retrieved }
 */
router.get('/:id', itemController.getOne);

/**
 * @openapi
 * /items:
 *   post:
 *     summary: Create an item (Super Admin / Inventory Manager)
 *     tags: [Items]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Item created }
 */
router.post('/', canWrite, writeLimiter, createItemValidators, validate, itemController.create);

/**
 * @openapi
 * /items/{id}:
 *   put:
 *     summary: Update an item (Super Admin / Inventory Manager)
 *     tags: [Items]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Item updated }
 */
router.put('/:id', canWrite, writeLimiter, updateItemValidators, validate, itemController.update);

/**
 * @openapi
 * /items/{id}:
 *   delete:
 *     summary: Soft-delete an item (Super Admin / Inventory Manager)
 *     tags: [Items]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Item deleted }
 */
router.delete('/:id', canWrite, writeLimiter, itemController.remove);

/**
 * @openapi
 * /items/{id}/movements:
 *   get:
 *     summary: List recent stock movements for an item
 *     tags: [Items]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Stock movements retrieved }
 *   post:
 *     summary: Record a stock movement (in/out/adjustment) for an item
 *     tags: [Items]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Stock movement recorded }
 */
router.get('/:id/movements', itemController.listMovements);
router.post(
  '/:id/movements',
  canWrite,
  writeLimiter,
  stockMovementValidators,
  validate,
  itemController.addMovement,
);

/**
 * @openapi
 * /items/{id}/consumption:
 *   post:
 *     summary: Record stock consumption for an item, also updating its daily demand history
 *     tags: [Items]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Consumption recorded }
 */
router.post(
  '/:id/consumption',
  canWrite,
  writeLimiter,
  consumptionValidators,
  validate,
  itemController.addConsumption,
);

export default router;
