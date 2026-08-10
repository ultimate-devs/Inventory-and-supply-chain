import { Router } from 'express';
import * as agentLogController from '../controllers/agentLogController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { createAgentLogValidators, listAgentLogValidators } from '../validators/agentLogValidators.js';
import { ROLES } from '../config/roles.js';

const router = Router();

router.use(protect);

/**
 * @openapi
 * /agent-logs:
 *   get:
 *     summary: List ADK agent-generated insights/recommendations, most recent first
 *     tags: [AgentLogs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Agent logs retrieved }
 *   post:
 *     summary: Record an ADK agent run's insight/recommendation (service accounts only)
 *     tags: [AgentLogs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Agent log recorded }
 */
router.get('/', listAgentLogValidators, validate, agentLogController.list);
router.post(
  '/',
  authorize(ROLES.ANALYST, ROLES.PROCUREMENT_OFFICER),
  writeLimiter,
  createAgentLogValidators,
  validate,
  agentLogController.create,
);

export default router;
