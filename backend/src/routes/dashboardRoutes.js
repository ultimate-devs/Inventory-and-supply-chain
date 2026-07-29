import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

/**
 * @openapi
 * /dashboard:
 *   get:
 *     summary: Get aggregated dashboard KPIs, stock-vs-reorder-point by category, critical items, and recent activity
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard data retrieved }
 */
router.get('/', protect, getDashboard);

export default router;
