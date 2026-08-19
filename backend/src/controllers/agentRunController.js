import * as agentRunService from '../services/agentRunService.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/roles.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';

// procurement can draft/submit a real purchase order, so it's restricted to
// the same roles allowed to raise one (see purchaseOrderRoutes.js's
// `canRequest`). The other three agents are read/recommend-only, so any
// authenticated user may trigger them.
const AGENT_RUN_ROLE_RESTRICTIONS = {
  procurement: [ROLES.SUPER_ADMIN, ROLES.PROCUREMENT_OFFICER],
};

export const trigger = asyncHandler(async (req, res) => {
  const { agentType } = req.params;

  const allowedRoles = AGENT_RUN_ROLE_RESTRICTIONS[agentType];
  if (allowedRoles && !allowedRoles.includes(req.user.role)) {
    throw ApiError.forbidden('You do not have permission to trigger this agent');
  }

  const { message, action, relatedModel, relatedId } = req.body;
  const result = await agentRunService.runAgent({ agentType, message, action, relatedModel, relatedId });

  sendResponse(res, 200, { data: result, message: 'Agent run complete' });
});
