import { body, param } from 'express-validator';
import { AGENT_RUN_TYPES } from '../services/agentRunService.js';

export const triggerAgentRunValidators = [
  param('agentType').isIn(AGENT_RUN_TYPES).withMessage('Invalid agent type'),
  body('message').trim().notEmpty().withMessage('message is required').isLength({ max: 2000 }),
  body('action').optional().trim().isLength({ max: 100 }),
  body('relatedModel').optional().trim().isLength({ max: 100 }),
  body('relatedId').optional().isMongoId().withMessage('relatedId must be a valid id'),
];
