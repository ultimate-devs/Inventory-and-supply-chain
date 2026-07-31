import { Router } from 'express';
import * as supplierController from '../controllers/supplierController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import {
  createSupplierValidators,
  updateSupplierValidators,
  statusValidators,
  catalogueEntryValidators,
  recommendQueryValidators,
} from '../validators/supplierValidators.js';
import { ROLES } from '../config/roles.js';

const router = Router();
const canWrite = authorize(ROLES.SUPER_ADMIN, ROLES.PROCUREMENT_OFFICER);

router.use(protect);

/**
 * @openapi
 * /suppliers:
 *   get:
 *     summary: List suppliers (search, filter by status, paginate, sort by performance score)
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Suppliers retrieved }
 */
router.get('/', supplierController.list);

/**
 * @openapi
 * /suppliers/ranked:
 *   get:
 *     summary: List approved suppliers ranked by performance score
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Ranked suppliers retrieved }
 */
router.get('/ranked', supplierController.ranked);

/**
 * @openapi
 * /suppliers/recommend:
 *   get:
 *     summary: Greedy-recommend the best supplier for an item (price/lead time/performance)
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: item
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Supplier recommendation computed }
 */
router.get('/recommend', recommendQueryValidators, validate, supplierController.recommend);

/**
 * @openapi
 * /suppliers/{id}:
 *   get:
 *     summary: Get a supplier by id
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Supplier retrieved }
 */
router.get('/:id', supplierController.getOne);

/**
 * @openapi
 * /suppliers:
 *   post:
 *     summary: Create a supplier (Super Admin / Procurement Officer)
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Supplier created }
 */
router.post('/', canWrite, writeLimiter, createSupplierValidators, validate, supplierController.create);

/**
 * @openapi
 * /suppliers/{id}:
 *   put:
 *     summary: Update a supplier (Super Admin / Procurement Officer)
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Supplier updated }
 */
router.put('/:id', canWrite, writeLimiter, updateSupplierValidators, validate, supplierController.update);

/**
 * @openapi
 * /suppliers/{id}:
 *   delete:
 *     summary: Soft-delete a supplier (Super Admin / Procurement Officer)
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Supplier deleted }
 */
router.delete('/:id', canWrite, writeLimiter, supplierController.remove);

/**
 * @openapi
 * /suppliers/{id}/status:
 *   patch:
 *     summary: Approve or suspend a supplier (Super Admin / Procurement Officer)
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Supplier status updated }
 */
router.patch('/:id/status', canWrite, writeLimiter, statusValidators, validate, supplierController.setStatus);

/**
 * @openapi
 * /suppliers/{id}/catalogue:
 *   post:
 *     summary: Add or update a catalogue entry (item price/lead time) for this supplier
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Catalogue entry saved }
 */
router.post(
  '/:id/catalogue',
  canWrite,
  writeLimiter,
  catalogueEntryValidators,
  validate,
  supplierController.upsertCatalogueEntry,
);

/**
 * @openapi
 * /suppliers/{id}/catalogue/{itemId}:
 *   delete:
 *     summary: Remove an item from this supplier's catalogue
 *     tags: [Suppliers]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Catalogue entry removed }
 */
router.delete('/:id/catalogue/:itemId', canWrite, writeLimiter, supplierController.removeCatalogueEntry);

export default router;
