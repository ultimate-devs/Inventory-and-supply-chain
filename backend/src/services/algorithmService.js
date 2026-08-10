import { Item } from '../models/Item.js';
import { GreedyRun } from '../models/GreedyRun.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { computeUrgencyScore, computeQuantityNeeded } from './algorithms/urgencyScore.js';
import { runGreedyAllocation } from './algorithms/greedyAllocation.js';
import { runProportionalAllocation } from './algorithms/proportionalAllocation.js';
import { compareAllocations } from './algorithms/algorithmComparison.js';
import { runRopEoqScenario } from './algorithms/ropEoqScenario.js';

/**
 * Real low-stock/critical items, turned into allocator candidates. Optionally
 * narrowed to a specific set of item ids so a user can hand-pick which
 * shortages to fund in a single run.
 */
export const buildCandidateItems = async (itemIds) => {
  const filter = { stockStatus: { $in: ['critical', 'low'] } };
  if (itemIds?.length) filter._id = { $in: itemIds };

  const items = await Item.find(filter);

  return items.map((item) => {
    const urgencyScore = computeUrgencyScore({
      currentStock: item.currentStock,
      reorderPoint: item.reorderPointProbabilistic || item.reorderPointSimple,
      safetyStock: item.safetyStock,
    });
    const quantityNeeded = computeQuantityNeeded({
      currentStock: item.currentStock,
      reorderPoint: item.reorderPointProbabilistic || item.reorderPointSimple,
      economicOrderQuantity: item.economicOrderQuantity,
    });

    return {
      item: item._id,
      name: item.name,
      urgencyScore,
      quantityNeeded,
      unitCost: item.unitCost,
      neededValue: quantityNeeded * item.unitCost,
    };
  });
};

export const previewCandidates = (itemIds) => buildCandidateItems(itemIds);

export const runGreedyPreview = async (budget, itemIds) => {
  const candidates = await buildCandidateItems(itemIds);
  return { itemsConsidered: candidates, result: runGreedyAllocation(candidates, budget) };
};

export const runProportionalPreview = async (budget, itemIds) => {
  const candidates = await buildCandidateItems(itemIds);
  return { itemsConsidered: candidates, result: runProportionalAllocation(candidates, budget) };
};

export const runComparisonAndSave = async (budget, itemIds, userId) => {
  const candidates = await buildCandidateItems(itemIds);
  const { greedy, proportional, ilp, deltas } = compareAllocations(candidates, budget);

  const run = await GreedyRun.create({
    runBy: userId,
    budget,
    itemsConsidered: candidates,
    greedyResult: greedy,
    proportionalResult: proportional,
    ilpResult: ilp,
  });

  return { run, deltas };
};

export const ropEoqScenario = (input) => runRopEoqScenario(input);

export const listGreedyRuns = async (query) => {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });
  const [runs, total] = await Promise.all([
    GreedyRun.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('runBy', 'name email'),
    GreedyRun.countDocuments({}),
  ]);
  return { runs, meta: buildMeta({ page, limit, total }) };
};

export const getGreedyRunById = async (id) => {
  const run = await GreedyRun.findById(id).populate('runBy', 'name email');
  if (!run) throw ApiError.notFound('Greedy run not found');
  return run;
};
