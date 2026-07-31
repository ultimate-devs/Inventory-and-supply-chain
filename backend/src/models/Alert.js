import mongoose from 'mongoose';

// Phase 1: schema-only lookahead for Member 3. Dashboard/Item Phase-1 code
// does not create Alert documents yet - Phase 2 wires up overdue-PO and
// stock-threshold alerts. No routes or controllers exist for this model yet.

export const ALERT_TYPES = Object.freeze({
  LOW_STOCK: 'low_stock',
  CRITICAL_STOCK: 'critical_stock',
  EXCESS_STOCK: 'excess_stock',
  OVERDUE_PO: 'overdue_po',
});

export const ALERT_SEVERITY = Object.freeze({ INFO: 'info', WARNING: 'warning', CRITICAL: 'critical' });
export const ALERT_STATUS = Object.freeze({ OPEN: 'open', ACKNOWLEDGED: 'acknowledged', RESOLVED: 'resolved' });

const alertSchema = new mongoose.Schema(
  {
    type: { type: String, enum: Object.values(ALERT_TYPES), required: true },
    severity: { type: String, enum: Object.values(ALERT_SEVERITY), default: ALERT_SEVERITY.WARNING },
    status: { type: String, enum: Object.values(ALERT_STATUS), default: ALERT_STATUS.OPEN },
    message: { type: String, required: true, trim: true, maxlength: 500 },

    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },

    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },

    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ item: 1 });
alertSchema.index({ purchaseOrder: 1 });

export const Alert = mongoose.model('Alert', alertSchema);
