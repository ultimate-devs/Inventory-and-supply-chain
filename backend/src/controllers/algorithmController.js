import * as algorithmService from '../services/algorithmService.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';
import { recordAuditEvent } from '../middleware/auditLog.js';

export const ropEoqScenario = asyncHandler(async (req, res) => {
  const result = algorithmService.ropEoqScenario(req.body);
  sendResponse(res, 200, { data: result, message: 'ROP/EOQ scenario computed' });
});

export const candidates = asyncHandler(async (req, res) => {
  const items = await algorithmService.previewCandidates();
  sendResponse(res, 200, { data: items, message: 'Low-stock candidate items retrieved' });
});

export const greedyAllocation = asyncHandler(async (req, res) => {
  const { itemsConsidered, result } = await algorithmService.runGreedyPreview(req.body.budget, req.body.items);
  sendResponse(res, 200, { data: { itemsConsidered, result }, message: 'Greedy allocation computed' });
});

export const proportionalAllocation = asyncHandler(async (req, res) => {
  const { itemsConsidered, result } = await algorithmService.runProportionalPreview(req.body.budget, req.body.items);
  sendResponse(res, 200, { data: { itemsConsidered, result }, message: 'Proportional allocation computed' });
});

export const compare = asyncHandler(async (req, res) => {
  const { run, deltas } = await algorithmService.runComparisonAndSave(req.body.budget, req.body.items, req.user.id);
  await recordAuditEvent({ actor: req.user.id, action: 'algorithm.compare', target: run._id.toString(), ip: req.ip });
  sendResponse(res, 201, { data: { run, deltas }, message: 'Algorithm comparison run saved' });
});

export const listRuns = asyncHandler(async (req, res) => {
  const { runs, meta } = await algorithmService.listGreedyRuns(req.query);
  sendResponse(res, 200, { data: runs, message: 'Greedy run history retrieved', meta });
});

export const getRun = asyncHandler(async (req, res) => {
  const run = await algorithmService.getGreedyRunById(req.params.id);
  sendResponse(res, 200, { data: run, message: 'Greedy run retrieved' });
});
