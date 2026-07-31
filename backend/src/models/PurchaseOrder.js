import mongoose from 'mongoose';

// Phase 1 added this as a schema-only lookahead. Phase 2 (Member 3) builds the
// full lifecycle on top of it: two-level approval, optimistic locking (via
// `version`), sending/shipping, and goods-receipt with discrepancy handling.
// No PurchaseOrder documents existed before Phase 2, so status values below
// are free to match the spec's naming exactly (no migration needed).

export const PO_STATUS = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SENT: 'sent',
  SHIPPED: 'shipped',
  PARTIALLY_RECEIVED: 'partially_received',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
});

// Statuses from which a PO can still be received against.
export const RECEIVABLE_STATUSES = [PO_STATUS.SENT, PO_STATUS.SHIPPED, PO_STATUS.PARTIALLY_RECEIVED];

const lineSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const statusHistoryEntrySchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(PO_STATUS), required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const approvalEntrySchema = new mongoose.Schema(
  {
    level: { type: Number, required: true, min: 1, max: 2 },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    decision: { type: String, enum: ['approved', 'rejected'], required: true },
    note: { type: String, trim: true, maxlength: 300 },
    decidedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const discrepancyEntrySchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    orderedQuantity: { type: Number, required: true },
    receivedQuantity: { type: Number, required: true },
    type: { type: String, enum: ['under_delivery', 'over_delivery'], required: true },
    variance: { type: Number, required: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, trim: true, uppercase: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recommendedSupplier: { type: Boolean, default: false },

    lines: { type: [lineSchema], default: [], validate: (v) => v.length > 0 },
    totalAmount: { type: Number, min: 0, default: 0 },

    status: { type: String, enum: Object.values(PO_STATUS), default: PO_STATUS.DRAFT },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },

    requiresSecondApproval: { type: Boolean, default: false },
    approvals: { type: [approvalEntrySchema], default: [] },

    discrepancies: { type: [discrepancyEntrySchema], default: [] },

    expectedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },

    // Optimistic lock: every status-changing write must match the version it
    // read and bump it, so two concurrent approvals can't silently clobber
    // each other.
    version: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

purchaseOrderSchema.index({ poNumber: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
purchaseOrderSchema.index({ supplier: 1, status: 1 });
purchaseOrderSchema.index({ status: 1, expectedDeliveryDate: 1 });

purchaseOrderSchema.pre(/^find/, function excludeSoftDeleted(next) {
  if (this.getFilter().includeDeleted) {
    delete this.getFilter().includeDeleted;
    return next();
  }
  this.where({ isDeleted: { $ne: true } });
  next();
});

export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
