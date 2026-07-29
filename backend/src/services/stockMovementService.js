import mongoose from 'mongoose';
import { Item } from '../models/Item.js';
import { StockMovement, MOVEMENT_TYPES } from '../models/StockMovement.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Records a stock movement and updates the owning item's currentStock inside
 * a single Mongo transaction, so the movement log and the item's stock can
 * never drift apart even if one write fails. Item.save() also re-triggers
 * ROP/EOQ/stock-status recalculation via its pre-save hook.
 *
 * quantity semantics: IN/OUT take a positive magnitude; ADJUSTMENT takes a
 * signed delta (positive to correct up, negative to correct down).
 */
export const recordStockMovement = async ({ itemId, type, quantity, reason, performedBy }) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const item = await Item.findById(itemId).session(session);
      if (!item) throw ApiError.notFound('Item not found');

      let delta;
      if (type === MOVEMENT_TYPES.IN) delta = Math.abs(quantity);
      else if (type === MOVEMENT_TYPES.OUT) delta = -Math.abs(quantity);
      else delta = quantity;

      const resultingStock = item.currentStock + delta;
      if (resultingStock < 0) {
        throw ApiError.badRequest('This movement would result in negative stock');
      }

      item.currentStock = resultingStock;
      await item.save({ session });

      const [movement] = await StockMovement.create(
        [{ item: item._id, type, quantity, reason, resultingStock, performedBy }],
        { session },
      );

      result = { item, movement };
    });
    return result;
  } finally {
    await session.endSession();
  }
};

export const listMovementsForItem = async (itemId, { limit = 50 } = {}) =>
  StockMovement.find({ item: itemId }).sort({ createdAt: -1 }).limit(limit).populate('performedBy', 'name email');
