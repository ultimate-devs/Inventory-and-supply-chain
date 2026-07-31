import { Router } from 'express';
import * as poController from '../controllers/purchaseOrderController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import {
  createPurchaseOrderValidators,
  updateDraftPurchaseOrderValidators,
  versionOnlyValidators,
  decisionValidators,
  receiveGoodsValidators,
} from '../validators/purchaseOrderValidators.js';
import { ROLES } from '../config/roles.js';

const router = Router();
// Raises, edits, and progresses the PO through the supplier-facing lifecycle.
const canRequest = authorize(ROLES.SUPER_ADMIN, ROLES.PROCUREMENT_OFFICER);
// Approves/rejects at either level - kept separate from canRequest so the
// person raising a PO is never the only one who can approve it.
const canApprove = authorize(ROLES.SUPER_ADMIN, ROLES.INVENTORY_MANAGER);

router.use(protect);

/**
 * @openapi
 * /purchase-orders:
 *   get:
 *     summary: List purchase orders (filter by status/supplier/date, paginate)
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Purchase orders retrieved }
 */
router.get('/', poController.list);

/**
 * @openapi
 * /purchase-orders/{id}:
 *   get:
 *     summary: Get a purchase order by id (status timeline, lines, approvals)
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Purchase order retrieved }
 */
router.get('/:id', poController.getOne);

/**
 * @openapi
 * /purchase-orders:
 *   post:
 *     summary: Create a draft purchase order (Super Admin / Procurement Officer)
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Purchase order created }
 */
router.post('/', canRequest, writeLimiter, createPurchaseOrderValidators, validate, poController.create);

/**
 * @openapi
 * /purchase-orders/{id}:
 *   put:
 *     summary: Edit a draft purchase order's lines/delivery date
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Purchase order updated }
 */
router.put('/:id', canRequest, writeLimiter, updateDraftPurchaseOrderValidators, validate, poController.updateDraft);

/**
 * @openapi
 * /purchase-orders/{id}:
 *   delete:
 *     summary: Soft-delete a draft purchase order
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Purchase order deleted }
 */
router.delete('/:id', canRequest, writeLimiter, poController.remove);

/**
 * @openapi
 * /purchase-orders/{id}/submit:
 *   post:
 *     summary: Submit a draft purchase order for approval
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Purchase order submitted for approval }
 */
router.post('/:id/submit', canRequest, writeLimiter, versionOnlyValidators, validate, poController.submit);

/**
 * @openapi
 * /purchase-orders/{id}/approve:
 *   post:
 *     summary: Approve a submitted purchase order (first or second level)
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Purchase order approval recorded }
 */
router.post('/:id/approve', canApprove, writeLimiter, decisionValidators, validate, poController.approve);

/**
 * @openapi
 * /purchase-orders/{id}/reject:
 *   post:
 *     summary: Reject a submitted purchase order
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Purchase order rejected }
 */
router.post('/:id/reject', canApprove, writeLimiter, decisionValidators, validate, poController.reject);

/**
 * @openapi
 * /purchase-orders/{id}/send:
 *   post:
 *     summary: Mark an approved purchase order as sent to the supplier
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Purchase order sent to supplier }
 */
router.post('/:id/send', canRequest, writeLimiter, versionOnlyValidators, validate, poController.send);

/**
 * @openapi
 * /purchase-orders/{id}/ship:
 *   post:
 *     summary: Mark a sent purchase order as shipped by the supplier
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Purchase order marked as shipped }
 */
router.post('/:id/ship', canRequest, writeLimiter, versionOnlyValidators, validate, poController.ship);

/**
 * @openapi
 * /purchase-orders/{id}/cancel:
 *   post:
 *     summary: Cancel a purchase order that hasn't been received yet
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Purchase order cancelled }
 */
router.post('/:id/cancel', canRequest, writeLimiter, decisionValidators, validate, poController.cancel);

/**
 * @openapi
 * /purchase-orders/{id}/receive:
 *   post:
 *     summary: Record a goods receipt (full/partial/over-delivery) against a purchase order
 *     tags: [Purchase Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Goods received }
 */
router.post('/:id/receive', canRequest, writeLimiter, receiveGoodsValidators, validate, poController.receive);

export default router;
