import mongoose from 'mongoose';
import { Item } from '../models/Item.js';
import { StockMovement, MOVEMENT_TYPES, INCREASING_TYPES, DECREASING_TYPES } from '../models/StockMovement.js';
import { ApiError } from '../utils/ApiError.js';

const DEMAND_HISTORY_MAX_ENTRIES = 90;

/**
 * Records a stock movement and updates the owning item's currentStock inside
 * a single Mongo transaction, so the movement log and the item's stock can
 * never drift apart even if one write fails. Item.save() also re-triggers
 * ROP/EOQ/stock-status recalculation (and alert sync) via its hooks.
 *
 * quantity semantics: IN/OUT/RECEIPT/CONSUMPTION/DAMAGE take a positive
 * magnitude; ADJUSTMENT takes a signed delta (positive to correct up,
 * negative to correct down).
 */
export const recordStockMovement = async ({ itemId, type, quantity, reason, performedBy, session: externalSession }) => {
  const session = externalSession ?? (await mongoose.startSession());
  const ownsSession = !externalSession;
  try {
    let result;
    const run = async () => {
      const item = await Item.findById(itemId).session(session);
      if (!item) throw ApiError.notFound('Item not found');

      let delta;
      if (INCREASING_TYPES.has(type)) delta = Math.abs(quantity);
      else if (DECREASING_TYPES.has(type)) delta = -Math.abs(quantity);
      else delta = quantity;

      const resultingStock = item.currentStock + delta;
      if (resultingStock < 0) {
        throw ApiError.badRequest('This movement would result in negative stock');
      }

      item.currentStock = resultingStock;

      if (type === MOVEMENT_TYPES.CONSUMPTION) {
        item.dailyDemandHistory.push({ date: new Date(), quantity: Math.abs(quantity) });
        if (item.dailyDemandHistory.length > DEMAND_HISTORY_MAX_ENTRIES) {
          item.dailyDemandHistory = item.dailyDemandHistory.slice(-DEMAND_HISTORY_MAX_ENTRIES);
        }
      }

      await item.save({ session });

      const [movement] = await StockMovement.create(
        [{ item: item._id, type, quantity, reason, resultingStock, performedBy }],
        { session },
      );

      result = { item, movement };
    };

    if (ownsSession) {
      await session.withTransaction(run);
    } else {
      await run();
    }
    return result;
  } finally {
    if (ownsSession) await session.endSession();
  }
};

export const recordConsumption = ({ itemId, quantity, reason, performedBy }) =>
  recordStockMovement({ itemId, type: MOVEMENT_TYPES.CONSUMPTION, quantity, reason, performedBy });

export const listMovementsForItem = async (itemId, { limit = 50 } = {}) =>
  StockMovement.find({ item: itemId }).sort({ createdAt: -1 }).limit(limit).populate('performedBy', 'name email');
