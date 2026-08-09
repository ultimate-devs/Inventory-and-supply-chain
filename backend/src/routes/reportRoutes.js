import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  stockTurnoverValidators,
  stockStatusBreakdownValidators,
  algorithmComparisonValidators,
  budgetUtilisationValidators,
  supplierPerformanceValidators,
  purchaseOrderPipelineValidators,
  categorySpendValidators,
} from '../validators/reportValidators.js';

const router = Router();

// Read-only for every role - Analyst in particular relies on these - so
// routes only require `protect`, no `authorize(...)` role gate.
router.use(protect);

/**
 * @openapi
 * /reports/stock-turnover:
 *   get:
 *     summary: Stock turnover (annual demand / average stock) per item, optionally filtered by category
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Stock turnover report retrieved }
 */
router.get('/stock-turnover', stockTurnoverValidators, validate, reportController.stockTurnover);

/**
 * @openapi
 * /reports/stock-status-breakdown:
 *   get:
 *     summary: Stock status distribution, overall and by category
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Stock status breakdown report retrieved }
 */
router.get('/stock-status-breakdown', stockStatusBreakdownValidators, validate, reportController.stockStatusBreakdown);

/**
 * @openapi
 * /reports/algorithm-comparison:
 *   get:
 *     summary: Recent Greedy/Proportional/ILP allocation runs, side by side
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Algorithm comparison report retrieved }
 */
router.get('/algorithm-comparison', algorithmComparisonValidators, validate, reportController.algorithmComparison);

/**
 * @openapi
 * /reports/budget-utilisation:
 *   get:
 *     summary: Budget utilisation percentage over time, across all allocation runs
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Budget utilisation over time report retrieved }
 */
router.get('/budget-utilisation', budgetUtilisationValidators, validate, reportController.budgetUtilisationOverTime);

/**
 * @openapi
 * /reports/supplier-performance:
 *   get:
 *     summary: Supplier performance across all scoring dimensions, for a radar chart
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Supplier performance report retrieved }
 */
router.get('/supplier-performance', supplierPerformanceValidators, validate, reportController.supplierPerformance);

/**
 * @openapi
 * /reports/po-pipeline:
 *   get:
 *     summary: Purchase order pipeline funnel counts and received-order lead times by supplier
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Purchase order pipeline report retrieved }
 */
router.get('/po-pipeline', purchaseOrderPipelineValidators, validate, reportController.purchaseOrderPipeline);

/**
 * @openapi
 * /reports/category-spend:
 *   get:
 *     summary: Committed and received spend by item category
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Category spend report retrieved }
 */
router.get('/category-spend', categorySpendValidators, validate, reportController.categorySpend);

export default router;
