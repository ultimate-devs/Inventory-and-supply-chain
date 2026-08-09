import mongoose from 'mongoose';
import { Item } from '../models/Item.js';
import { Category } from '../models/Category.js';
import { StockMovement } from '../models/StockMovement.js';
import { Supplier, SUPPLIER_STATUS } from '../models/Supplier.js';
import { PurchaseOrder, PO_STATUS } from '../models/PurchaseOrder.js';
import { GreedyRun } from '../models/GreedyRun.js';

// Seven report aggregations, one per Reports/Analytics page. Each is a
// dedicated pipeline shaped around what its page needs to chart, not a raw
// collection dump - mirrors dashboardService.js's aggregation style, and
// like it, explicitly matches isDeleted:{$ne:true} on any aggregate() over a
// soft-deleted model, since .aggregate() bypasses the schema's pre(/^find/)
// soft-delete hook.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pct = (allocated, budget) => (budget > 0 ? Math.round((allocated / budget) * 10000) / 100 : 0);

const allocationSummary = (result) =>
  result && {
    totalAllocated: result.totalAllocated,
    itemsFullyCovered: result.itemsFullyCovered,
    itemsPartiallyCovered: result.itemsPartiallyCovered,
    itemsUncovered: result.itemsUncovered,
    weightedUrgencyServed: result.weightedUrgencyServed,
  };

/**
 * Report 1: Stock Turnover - annual demand / average stock, per item.
 * Average stock is approximated from StockMovement.resultingStock over the
 * trailing `days` window (no daily stock-snapshot collection exists), falling
 * back to currentStock for items with no movements in that window.
 *
 * Computed as two independent aggregations merged in-process rather than a
 * per-item $lookup sub-pipeline: at 10k items, a correlated $lookup means 10k
 * separate index lookups + $group evaluations (seconds), whereas grouping
 * StockMovement once by item and joining in JS is a single collection scan.
 */
export const getStockTurnoverReport = async ({ category, days = 90 } = {}) => {
  const since = new Date(Date.now() - days * MS_PER_DAY);
  const match = { isDeleted: { $ne: true } };
  if (category) match.category = new mongoose.Types.ObjectId(category);

  // .lean() + a small in-memory category map instead of .populate(): at 10k
  // items, skipping Mongoose document hydration and per-document population
  // is what gets this under budget (categories are few enough to fetch once).
  const [items, categories, avgStockByItem] = await Promise.all([
    Item.find(match).select('name sku category avgDailyDemand currentStock').lean(),
    Category.find({}).select('name').lean(),
    StockMovement.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$item', avgStock: { $avg: '$resultingStock' } } },
    ]),
  ]);

  const categoryNameMap = new Map(categories.map((c) => [c._id.toString(), c.name]));
  const avgStockMap = new Map(avgStockByItem.map((r) => [r._id.toString(), r.avgStock]));

  const rows = items.map((item) => {
    const annualDemand = Math.round((item.avgDailyDemand || 0) * 365 * 100) / 100;
    const avgStock = Math.round((avgStockMap.get(item._id.toString()) ?? item.currentStock) * 100) / 100;
    const turnoverRatio = avgStock > 0 ? Math.round((annualDemand / avgStock) * 100) / 100 : 0;
    return {
      itemId: item._id,
      name: item.name,
      sku: item.sku,
      category: categoryNameMap.get(item.category?.toString()) ?? null,
      annualDemand,
      avgStock,
      turnoverRatio,
    };
  });

  rows.sort((a, b) => b.turnoverRatio - a.turnoverRatio);
  return rows;
};

/** Report 2: Stock Status Breakdown - overall and per-category distribution. */
export const getStockStatusBreakdownReport = async () => {
  const notDeleted = { $match: { isDeleted: { $ne: true } } };

  const [byStatus, byCategory] = await Promise.all([
    Item.aggregate([
      notDeleted,
      { $group: { _id: '$stockStatus', count: { $sum: 1 } } },
      { $project: { _id: 0, stockStatus: '$_id', count: 1 } },
      { $sort: { stockStatus: 1 } },
    ]),
    Item.aggregate([
      notDeleted,
      { $group: { _id: { category: '$category', stockStatus: '$stockStatus' }, count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id.category', foreignField: '_id', as: 'categoryDoc' } },
      { $unwind: '$categoryDoc' },
      { $project: { _id: 0, category: '$categoryDoc.name', stockStatus: '$_id.stockStatus', count: 1 } },
      { $sort: { category: 1, stockStatus: 1 } },
    ]),
  ]);

  return { byStatus, byCategory };
};

/** Report 3: Greedy vs Proportional vs ILP - recent runs, side by side. */
export const getAlgorithmComparisonReport = async ({ limit = 20 } = {}) => {
  const runs = await GreedyRun.find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 20, 100))
    .select('budget greedyResult proportionalResult ilpResult createdAt runBy')
    .populate('runBy', 'name');

  return runs.map((run) => ({
    runId: run._id,
    createdAt: run.createdAt,
    budget: run.budget,
    runBy: run.runBy?.name ?? null,
    greedy: { ...allocationSummary(run.greedyResult), budgetUtilisationPct: pct(run.greedyResult.totalAllocated, run.budget) },
    proportional: {
      ...allocationSummary(run.proportionalResult),
      budgetUtilisationPct: pct(run.proportionalResult.totalAllocated, run.budget),
    },
    ilp: run.ilpResult
      ? { ...allocationSummary(run.ilpResult), budgetUtilisationPct: pct(run.ilpResult.totalAllocated, run.budget) }
      : null,
  }));
};

/** Report 4: Budget Utilisation Over Time - one point per run, for a trend line. */
export const getBudgetUtilisationOverTimeReport = async ({ from, to } = {}) => {
  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const runs = await GreedyRun.find(filter)
    .sort({ createdAt: 1 })
    .select('budget greedyResult proportionalResult ilpResult createdAt');

  return runs.map((run) => ({
    runId: run._id,
    createdAt: run.createdAt,
    budget: run.budget,
    greedyUtilisationPct: pct(run.greedyResult.totalAllocated, run.budget),
    proportionalUtilisationPct: pct(run.proportionalResult.totalAllocated, run.budget),
    ilpUtilisationPct: run.ilpResult ? pct(run.ilpResult.totalAllocated, run.budget) : null,
  }));
};

/**
 * Report 5: Supplier Performance Radar - the four scoring dimensions plus
 * overall score. These are already maintained live by supplierScoring.js on
 * every goods receipt, so this is a direct read, not a new aggregation.
 */
export const getSupplierPerformanceReport = async () => {
  const suppliers = await Supplier.find({ status: SUPPLIER_STATUS.APPROVED })
    .select('name onTimeRate accuracyRate leadTimeReliability priceConsistency performanceScore')
    .sort({ performanceScore: -1 });

  return suppliers.map((s) => ({
    supplierId: s._id,
    name: s.name,
    onTimeRate: s.onTimeRate,
    accuracyRate: s.accuracyRate,
    leadTimeReliability: s.leadTimeReliability,
    priceConsistency: s.priceConsistency,
    performanceScore: s.performanceScore,
  }));
};

/** Report 6: Purchase Order Pipeline / Lead Time - funnel counts + received-order lead times. */
export const getPurchaseOrderPipelineReport = async () => {
  const notDeleted = { isDeleted: { $ne: true } };

  const [pipeline, leadTimeBySupplier] = await Promise.all([
    PurchaseOrder.aggregate([
      { $match: notDeleted },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
      { $sort: { status: 1 } },
    ]),
    PurchaseOrder.aggregate([
      { $match: { ...notDeleted, status: PO_STATUS.RECEIVED, actualDeliveryDate: { $ne: null } } },
      {
        $project: {
          supplier: 1,
          leadTimeDays: { $divide: [{ $subtract: ['$actualDeliveryDate', '$createdAt'] }, MS_PER_DAY] },
        },
      },
      {
        $group: {
          _id: '$supplier',
          avgLeadTimeDays: { $avg: '$leadTimeDays' },
          minLeadTimeDays: { $min: '$leadTimeDays' },
          maxLeadTimeDays: { $max: '$leadTimeDays' },
          receivedCount: { $sum: 1 },
        },
      },
      { $lookup: { from: 'suppliers', localField: '_id', foreignField: '_id', as: 'supplierDoc' } },
      { $unwind: '$supplierDoc' },
      {
        $project: {
          _id: 0,
          supplierId: '$_id',
          supplierName: '$supplierDoc.name',
          avgLeadTimeDays: { $round: ['$avgLeadTimeDays', 1] },
          minLeadTimeDays: { $round: ['$minLeadTimeDays', 1] },
          maxLeadTimeDays: { $round: ['$maxLeadTimeDays', 1] },
          receivedCount: 1,
        },
      },
      { $sort: { avgLeadTimeDays: 1 } },
    ]),
  ]);

  return { pipeline, leadTimeBySupplier };
};

/**
 * Report 7: Category-Level Spend - committed (ordered) vs received spend per
 * category, over an optional date range. Excludes draft/rejected/cancelled
 * POs, which never represent real spend commitment.
 *
 * Groups by item first (single collection pass, no join) and resolves
 * item->category->name via two small in-memory maps rather than $lookup-ing
 * per PO line: at 10k items, unwinding ~10k lines and joining each one
 * against the items/categories collections inside the pipeline is far slower
 * than fetching {_id, category} for every item once (a tiny projection) and
 * merging in JS.
 */
export const getCategorySpendReport = async ({ from, to } = {}) => {
  const match = {
    isDeleted: { $ne: true },
    status: { $nin: [PO_STATUS.DRAFT, PO_STATUS.CANCELLED, PO_STATUS.REJECTED] },
  };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const [spendByItem, items, categories] = await Promise.all([
    PurchaseOrder.aggregate([
      { $match: match },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.item',
          committedSpend: { $sum: { $multiply: ['$lines.quantity', '$lines.unitPrice'] } },
          receivedSpend: { $sum: { $multiply: ['$lines.receivedQuantity', '$lines.unitPrice'] } },
          lineCount: { $sum: 1 },
        },
      },
    ]),
    Item.find({}).select('category').lean(),
    Category.find({}).select('name').lean(),
  ]);

  const categoryOfItem = new Map(items.map((i) => [i._id.toString(), i.category?.toString()]));
  const categoryName = new Map(categories.map((c) => [c._id.toString(), c.name]));

  const totalsByCategory = new Map();
  spendByItem.forEach((row) => {
    const categoryId = categoryOfItem.get(row._id.toString());
    if (!categoryId) return; // item since deleted/unknown - excluded rather than shown as "unknown"
    const bucket = totalsByCategory.get(categoryId) ?? { committedSpend: 0, receivedSpend: 0, lineCount: 0 };
    bucket.committedSpend += row.committedSpend;
    bucket.receivedSpend += row.receivedSpend;
    bucket.lineCount += row.lineCount;
    totalsByCategory.set(categoryId, bucket);
  });

  const rows = [...totalsByCategory.entries()].map(([categoryId, totals]) => ({
    categoryId,
    category: categoryName.get(categoryId) ?? null,
    committedSpend: Math.round(totals.committedSpend * 100) / 100,
    receivedSpend: Math.round(totals.receivedSpend * 100) / 100,
    lineCount: totals.lineCount,
  }));

  rows.sort((a, b) => b.committedSpend - a.committedSpend);
  return rows;
};
