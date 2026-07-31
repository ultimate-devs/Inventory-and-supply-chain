import { Router } from 'express';
import * as algorithmController from '../controllers/algorithmController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { allocationValidators } from '../validators/algorithmValidators.js';

const router = Router();

router.use(protect);

/**
 * @openapi
 * /algorithms/candidates:
 *   get:
 *     summary: List real low-stock/critical items eligible for a budget allocation run
 *     tags: [Algorithms]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Low-stock candidate items retrieved }
 */
router.get('/candidates', algorithmController.candidates);

/**
 * @openapi
 * /algorithms/greedy-allocation:
 *   post:
 *     summary: Run the urgency-ranked Greedy budget allocator against real low-stock items
 *     tags: [Algorithms]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Greedy allocation computed }
 */
router.post('/greedy-allocation', writeLimiter, allocationValidators, validate, algorithmController.greedyAllocation);

/**
 * @openapi
 * /algorithms/proportional-allocation:
 *   post:
 *     summary: Run the Proportional budget allocation baseline
 *     tags: [Algorithms]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Proportional allocation computed }
 */
router.post(
  '/proportional-allocation',
  writeLimiter,
  allocationValidators,
  validate,
  algorithmController.proportionalAllocation,
);

/**
 * @openapi
 * /algorithms/compare:
 *   post:
 *     summary: Run Greedy and Proportional side-by-side and save the run to history
 *     tags: [Algorithms]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Algorithm comparison run saved }
 */
router.post('/compare', writeLimiter, allocationValidators, validate, algorithmController.compare);

/**
 * @openapi
 * /algorithms/runs:
 *   get:
 *     summary: List past Greedy Algorithm runs
 *     tags: [Algorithms]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Greedy run history retrieved }
 */
router.get('/runs', algorithmController.listRuns);

/**
 * @openapi
 * /algorithms/runs/{id}:
 *   get:
 *     summary: Get one past Greedy Algorithm run
 *     tags: [Algorithms]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Greedy run retrieved }
 */
router.get('/runs/:id', algorithmController.getRun);

export default router;
