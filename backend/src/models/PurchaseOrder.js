import mongoose from 'mongoose';

// Phase 1: schema-only lookahead for Member 3 (Suppliers & Procurement). No
// routes or controllers exist for this model yet - Phase 2 builds the
// two-level approval workflow, GRN, and overdue-PO alerts on top of it.

export const PO_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  ORDERED: 'ordered',
  PARTIALLY_RECEIVED: 'partially_received',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
});

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

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, trim: true, uppercase: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    lines: { type: [lineSchema], default: [], validate: (v) => v.length > 0 },
    totalAmount: { type: Number, min: 0, default: 0 },

    status: { type: String, enum: Object.values(PO_STATUS), default: PO_STATUS.DRAFT },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },

    expectedDeliveryDate: { type: Date },

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
