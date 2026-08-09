import mongoose from 'mongoose';
import { PurchaseOrder, PO_STATUS, RECEIVABLE_STATUSES } from '../models/PurchaseOrder.js';
import { Supplier } from '../models/Supplier.js';
import { Alert, ALERT_TYPES, ALERT_SEVERITY, ALERT_STATUS } from '../models/Alert.js';
import { ApiError } from '../utils/ApiError.js';
import { recordStockMovement } from './stockMovementService.js';
import { MOVEMENT_TYPES } from '../models/StockMovement.js';
import { applyReceiptToStats } from './algorithms/supplierScoring.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Severity scales with how large the gap is relative to what was ordered on
// that line, not just its absolute size - a 2-unit shortfall on an order of
// 5 is a bigger problem than a 2-unit shortfall on an order of 500.
const discrepancySeverity = (variance, orderedQuantity) => {
  const ratio = orderedQuantity > 0 ? Math.abs(variance) / orderedQuantity : 1;
  if (ratio >= 0.5) return ALERT_SEVERITY.CRITICAL;
  if (ratio >= 0.2) return ALERT_SEVERITY.WARNING;
  return ALERT_SEVERITY.INFO;
};

/**
 * Records a Goods Received Note against a purchase order: for each line,
 * detects under/over-delivery, posts a RECEIPT stock movement (which itself
 * recalculates ROP/EOQ/stock-status and opens/resolves the item's alert),
 * advances the PO to partially_received/received, resolves any overdue_po
 * alert, and - once the PO is fully received - recalculates the supplier's
 * performance score. All of this happens inside a single transaction so
 * stock, alerts, and the supplier score can never drift out of sync.
 */
export const receiveGoods = async (poId, incomingLines, expectedVersion, userId) => {
  const preCheck = await PurchaseOrder.findById(poId);
  if (!preCheck) throw ApiError.notFound('Purchase order not found');
  if (preCheck.version !== expectedVersion) {
    throw ApiError.conflict('This purchase order was changed by someone else - refresh and try again');
  }
  if (!RECEIVABLE_STATUSES.includes(preCheck.status)) {
    throw ApiError.badRequest(`Cannot receive goods against a purchase order in status ${preCheck.status}`);
  }

  const session = await mongoose.startSession();
  try {
    let response;

    await session.withTransaction(async () => {
      const po = await PurchaseOrder.findOne({ _id: poId, version: expectedVersion }).session(session);
      if (!po) {
        throw ApiError.conflict('This purchase order was changed by someone else - refresh and try again');
      }
      if (!RECEIVABLE_STATUSES.includes(po.status)) {
        throw ApiError.badRequest(`Cannot receive goods against a purchase order in status ${po.status}`);
      }

      for (const incoming of incomingLines) {
        const poLine = po.lines.find((l) => l.item.toString() === incoming.item);
        if (!poLine) throw ApiError.badRequest('Item is not part of this purchase order');
        if (incoming.receivedQuantity <= 0) continue;

        const remainingExpected = Math.max(0, poLine.quantity - poLine.receivedQuantity);
        const variance = incoming.receivedQuantity - remainingExpected;
        if (variance !== 0) {
          po.discrepancies.push({
            item: poLine.item,
            orderedQuantity: poLine.quantity,
            receivedQuantity: poLine.receivedQuantity + incoming.receivedQuantity,
            type: variance < 0 ? 'under_delivery' : 'over_delivery',
            variance,
          });

          // eslint-disable-next-line no-await-in-loop
          await Alert.create(
            [
              {
                type: ALERT_TYPES.QUANTITY_DISCREPANCY,
                severity: discrepancySeverity(variance, poLine.quantity),
                message: `PO ${po.poNumber}: received ${incoming.receivedQuantity} of ${remainingExpected} expected (${
                  variance > 0 ? 'over' : 'under'
                } by ${Math.abs(variance)})`,
                item: poLine.item,
                purchaseOrder: po._id,
                supplier: po.supplier,
              },
            ],
            { session },
          );
        }
        poLine.receivedQuantity += incoming.receivedQuantity;

        // eslint-disable-next-line no-await-in-loop
        await recordStockMovement({
          itemId: incoming.item,
          type: MOVEMENT_TYPES.RECEIPT,
          quantity: incoming.receivedQuantity,
          reason: `Goods receipt for PO ${po.poNumber}`,
          performedBy: userId,
          session,
        });
      }

      const allFullyReceived = po.lines.every((l) => l.receivedQuantity >= l.quantity);
      const newStatus = allFullyReceived ? PO_STATUS.RECEIVED : PO_STATUS.PARTIALLY_RECEIVED;
      const now = new Date();

      po.status = newStatus;
      po.version += 1;
      po.statusHistory.push({ status: newStatus, changedBy: userId, changedAt: now });
      if (newStatus === PO_STATUS.RECEIVED) po.actualDeliveryDate = now;

      await po.save({ session });

      await Alert.updateMany(
        {
          purchaseOrder: po._id,
          type: ALERT_TYPES.OVERDUE_PO,
          status: { $in: [ALERT_STATUS.OPEN, ALERT_STATUS.ACKNOWLEDGED] },
        },
        { $set: { status: ALERT_STATUS.RESOLVED, resolvedAt: now, resolvedBy: userId } },
        { session },
      );

      let supplier = null;
      if (newStatus === PO_STATUS.RECEIVED) {
        supplier = await Supplier.findById(po.supplier).session(session);

        const onTime = po.expectedDeliveryDate ? po.actualDeliveryDate <= po.expectedDeliveryDate : true;
        const leadTimeDeviationDays = po.expectedDeliveryDate
          ? (po.actualDeliveryDate - po.expectedDeliveryDate) / MS_PER_DAY
          : 0;
        const totalLines = po.lines.length;
        const accurateLines = po.lines.filter((l) => l.receivedQuantity === l.quantity).length;

        const priceDeviations = po.lines
          .map((l) => {
            const catalogueEntry = supplier.itemsCatalogue.find((c) => c.item.toString() === l.item.toString());
            if (!catalogueEntry || catalogueEntry.unitPrice === 0) return null;
            return ((l.unitPrice - catalogueEntry.unitPrice) / catalogueEntry.unitPrice) * 100;
          })
          .filter((d) => d !== null);
        const priceDeviationPercent = priceDeviations.length
          ? priceDeviations.reduce((sum, d) => sum + d, 0) / priceDeviations.length
          : 0;

        const { stats: nextStats, scores } = applyReceiptToStats(supplier.stats, {
          onTime,
          totalLines,
          accurateLines,
          leadTimeDeviationDays,
          priceDeviationPercent,
        });

        supplier.stats = nextStats;
        supplier.onTimeRate = scores.onTimeRate;
        supplier.accuracyRate = scores.accuracyRate;
        supplier.leadTimeReliability = scores.leadTimeReliability;
        supplier.priceConsistency = scores.priceConsistency;
        supplier.performanceScore = scores.overallScore;
        supplier.scoreHistory.push({ date: now, ...scores });

        await supplier.save({ session });
      }

      response = { purchaseOrder: po, supplier };
    });

    return response;
  } finally {
    await session.endSession();
  }
};
