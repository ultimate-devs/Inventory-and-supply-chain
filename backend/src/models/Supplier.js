import mongoose from 'mongoose';

// Phase 1 added this as a schema-only lookahead. Phase 2 (Member 3) builds the
// full supplier lifecycle on top of it: catalogue, performance scoring, and
// approve/suspend status gating which suppliers can be selected for a PO.

export const SUPPLIER_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  SUSPENDED: 'suspended',
});

const catalogueEntrySchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    supplierSku: { type: String, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    leadTimeDays: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const scoreHistoryEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    onTimeRate: { type: Number, min: 0, max: 100, required: true },
    accuracyRate: { type: Number, min: 0, max: 100, required: true },
    leadTimeReliability: { type: Number, min: 0, max: 100, required: true },
    priceConsistency: { type: Number, min: 0, max: 100, required: true },
    overallScore: { type: Number, min: 0, max: 100, required: true },
  },
  { _id: false },
);

// Running aggregates used to compute the four weighted performance metrics
// without re-scanning every PurchaseOrder/GRN on each recalculation.
const statsSchema = new mongoose.Schema(
  {
    totalDeliveries: { type: Number, default: 0, min: 0 },
    onTimeDeliveries: { type: Number, default: 0, min: 0 },
    totalReceivedLines: { type: Number, default: 0, min: 0 },
    accurateReceivedLines: { type: Number, default: 0, min: 0 },
    leadTimeDeviationSum: { type: Number, default: 0 },
    leadTimeSampleCount: { type: Number, default: 0, min: 0 },
    priceDeviationSum: { type: Number, default: 0 },
    priceSampleCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    contactName: { type: String, trim: true, maxlength: 100 },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    contactPhone: { type: String, trim: true, maxlength: 30 },
    address: { type: String, trim: true, maxlength: 300 },

    itemsCatalogue: { type: [catalogueEntrySchema], default: [] },
    scoreHistory: { type: [scoreHistoryEntrySchema], default: [] },
    stats: { type: statsSchema, default: () => ({}) },

    // Cached, server-computed breakdown - recalculated by supplierScoringService
    // after every goods receipt. Never set directly by clients.
    onTimeRate: { type: Number, min: 0, max: 100, default: 100 },
    accuracyRate: { type: Number, min: 0, max: 100, default: 100 },
    leadTimeReliability: { type: Number, min: 0, max: 100, default: 100 },
    priceConsistency: { type: Number, min: 0, max: 100, default: 100 },
    performanceScore: { type: Number, min: 0, max: 100, default: 100 },

    status: { type: String, enum: Object.values(SUPPLIER_STATUS), default: SUPPLIER_STATUS.PENDING },
    statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    statusChangedAt: { type: Date },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

supplierSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
supplierSchema.index({ 'itemsCatalogue.item': 1 });
supplierSchema.index({ status: 1, performanceScore: -1 });

supplierSchema.pre(/^find/, function excludeSoftDeleted(next) {
  if (this.getFilter().includeDeleted) {
    delete this.getFilter().includeDeleted;
    return next();
  }
  this.where({ isDeleted: { $ne: true } });
  next();
});

export const Supplier = mongoose.model('Supplier', supplierSchema);
