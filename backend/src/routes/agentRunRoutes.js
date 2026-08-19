import { Router } from 'express';
import * as agentRunController from '../controllers/agentRunController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { triggerAgentRunValidators } from '../validators/agentRunValidators.js';

const router = Router();

router.use(protect);

/**
 * @openapi
 * /agent-runs/{agentType}:
 *   post:
 *     summary: Trigger an ADK agent run on demand (monitoring, advisory, analytics are open to any authenticated user; procurement requires Super Admin or Procurement Officer)
 *     tags: [AgentLogs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Agent run complete }
 */
router.post('/:agentType', writeLimiter, triggerAgentRunValidators, validate, agentRunController.trigger);

export default router;
