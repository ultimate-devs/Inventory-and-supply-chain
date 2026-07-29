import { Item } from '../models/Item.js';
import { AuditLog } from '../models/AuditLog.js';
import { STOCK_STATUS } from './algorithms/stockStatus.js';

const CRITICAL_ITEMS_LIMIT = 10;
const RECENT_ACTIVITY_LIMIT = 15;

export const getDashboardData = async () => {
  // aggregate() bypasses the schema's pre(/^find/) soft-delete middleware,
  // so both pipelines below start with an explicit isDeleted match.
  const notDeleted = { $match: { isDeleted: { $ne: true } } };

  const [kpiAgg, byCategory, criticalItems, recentActivity] = await Promise.all([
    Item.aggregate([
      notDeleted,
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalInventoryValue: { $sum: { $multiply: ['$unitCost', '$currentStock'] } },
          criticalItemCount: {
            $sum: { $cond: [{ $eq: ['$stockStatus', STOCK_STATUS.CRITICAL] }, 1, 0] },
          },
          lowItemCount: {
            $sum: { $cond: [{ $eq: ['$stockStatus', STOCK_STATUS.LOW] }, 1, 0] },
          },
          excessItemCount: {
            $sum: { $cond: [{ $eq: ['$stockStatus', STOCK_STATUS.EXCESS] }, 1, 0] },
          },
        },
      },
    ]),
    Item.aggregate([
      notDeleted,
      {
        $group: {
          _id: '$category',
          totalStock: { $sum: '$currentStock' },
          totalReorderPoint: { $sum: '$reorderPointProbabilistic' },
          itemCount: { $sum: 1 },
        },
      },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          categoryId: '$category._id',
          categoryName: '$category.name',
          totalStock: 1,
          totalReorderPoint: 1,
          itemCount: 1,
        },
      },
      { $sort: { categoryName: 1 } },
    ]),
    Item.find({ stockStatus: STOCK_STATUS.CRITICAL })
      .select('name sku currentStock safetyStock reorderPointProbabilistic stockStatus category')
      .populate('category', 'name')
      .sort({ currentStock: 1 })
      .limit(CRITICAL_ITEMS_LIMIT),
    AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(RECENT_ACTIVITY_LIMIT)
      .populate('actor', 'name email'),
  ]);

  const kpis = kpiAgg[0] || {
    totalItems: 0,
    totalInventoryValue: 0,
    criticalItemCount: 0,
    lowItemCount: 0,
    excessItemCount: 0,
  };

  return {
    kpis: {
      totalItems: kpis.totalItems,
      totalInventoryValue: Math.round(kpis.totalInventoryValue * 100) / 100,
      criticalItemCount: kpis.criticalItemCount,
      lowItemCount: kpis.lowItemCount,
      excessItemCount: kpis.excessItemCount,
      // Purchase orders don't exist yet (Phase 2 / Member 3) - always 0 for now.
      pendingOrders: 0,
    },
    stockVsReorderByCategory: byCategory,
    criticalItems,
    recentActivity,
  };
};
