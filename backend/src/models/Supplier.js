import mongoose from 'mongoose';

// Phase 1: schema-only lookahead for Member 3 (Suppliers & Procurement), agreed
// in the Week-1 schema session so Phase 2 can start without churn. No routes
// or controllers exist for this model yet.

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
    deliveryScore: { type: Number, min: 0, max: 100, required: true },
    qualityScore: { type: Number, min: 0, max: 100, required: true },
    costScore: { type: Number, min: 0, max: 100, required: true },
    overallScore: { type: Number, min: 0, max: 100, required: true },
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

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

supplierSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
supplierSchema.index({ 'itemsCatalogue.item': 1 });

supplierSchema.pre(/^find/, function excludeSoftDeleted(next) {
  if (this.getFilter().includeDeleted) {
    delete this.getFilter().includeDeleted;
    return next();
  }
  this.where({ isDeleted: { $ne: true } });
  next();
});

export const Supplier = mongoose.model('Supplier', supplierSchema);
