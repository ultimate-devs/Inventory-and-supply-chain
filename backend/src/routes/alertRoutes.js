import { Router } from 'express';
import * as alertController from '../controllers/alertController.js';
import { protect } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.use(protect);

/**
 * @openapi
 * /alerts:
 *   get:
 *     summary: List alerts (filter by status/type, paginate)
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Alerts retrieved }
 */
router.get('/', alertController.list);

/**
 * @openapi
 * /alerts/unread-count:
 *   get:
 *     summary: Count of open alerts, for the notification bell badge
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread alert count retrieved }
 */
router.get('/unread-count', alertController.unreadCount);

/**
 * @openapi
 * /alerts/{id}/acknowledge:
 *   post:
 *     summary: Acknowledge an open alert (marks it seen without resolving the underlying issue)
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Alert acknowledged }
 */
router.post('/:id/acknowledge', writeLimiter, alertController.acknowledge);

/**
 * @openapi
 * /alerts/{id}/resolve:
 *   post:
 *     summary: Manually resolve an alert
 *     tags: [Alerts]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Alert resolved }
 */
router.post('/:id/resolve', writeLimiter, alertController.resolve);

export default router;
