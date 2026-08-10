import { body, query } from 'express-validator';
import { AGENT_TYPES, AGENT_LOG_TRIGGER } from '../models/AgentLog.js';

export const createAgentLogValidators = [
  body('agentType').isIn(Object.values(AGENT_TYPES)).withMessage('Invalid agent type'),
  body('action').trim().notEmpty().withMessage('Action is required').isLength({ max: 100 }),
  body('summary').trim().notEmpty().withMessage('Summary is required').isLength({ max: 2000 }),
  body('relatedModel').optional().trim().isLength({ max: 100 }),
  body('relatedId').optional().isMongoId().withMessage('relatedId must be a valid id'),
  body('triggeredBy').isIn(Object.values(AGENT_LOG_TRIGGER)).withMessage('Invalid trigger source'),
];

export const listAgentLogValidators = [
  query('agentType').optional().isIn(Object.values(AGENT_TYPES)).withMessage('Invalid agent type'),
];
