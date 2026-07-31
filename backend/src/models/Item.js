import mongoose from 'mongoose';
import { STOCK_STATUS } from '../services/algorithms/stockStatus.js';
import { computeItemMetrics } from '../services/algorithms/computeItemMetrics.js';
import { SystemSettings } from './SystemSettings.js';
import { syncStockAlerts } from '../services/alertService.js';

const demandEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 1000 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },

    unitCost: { type: Number, required: true, min: 0 },
    currentStock: { type: Number, required: true, min: 0, default: 0 },

    leadTimeDays: { type: Number, required: true, min: 0, default: 7 },
    orderingCost: { type: Number, required: true, min: 0, default: 0 },
    holdingCostPerUnit: { type: Number, required: true, min: 0, default: 0 },
    safetyStock: { type: Number, min: 0, default: 0 },
    serviceLevel: { type: Number, enum: [90, 95, 99], default: 95 },

    dailyDemandHistory: { type: [demandEntrySchema], default: [] },

    // Cached, server-computed fields - recalculated by recalculateItemMetrics()
    // on every save and stock movement, never set directly by clients.
    avgDailyDemand: { type: Number, default: 0 },
    demandStdDev: { type: Number, default: 0 },
    reorderPointSimple: { type: Number, default: 0 },
    reorderPointProbabilistic: { type: Number, default: 0 },
    economicOrderQuantity: { type: Number, default: 0 },
    stockStatus: { type: String, enum: Object.values(STOCK_STATUS), default: STOCK_STATUS.OK },
    lastCalculatedAt: { type: Date },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

itemSchema.index({ sku: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
itemSchema.index({ name: 'text', sku: 'text' });
itemSchema.index({ category: 1 });
itemSchema.index({ stockStatus: 1 });

itemSchema.pre(/^find/, function excludeSoftDeleted(next) {
  if (this.getFilter().includeDeleted) {
    delete this.getFilter().includeDeleted;
    return next();
  }
  this.where({ isDeleted: { $ne: true } });
  next();
});

// Auto-recalculate ROP/EOQ/stock-status on every save (creation, edits, and
// stock movements all go through here), against the current system settings.
itemSchema.pre('save', async function recalcMetrics(next) {
  try {
    const settings = await SystemSettings.getSingleton();
    Object.assign(this, computeItemMetrics(this, { excessStockMultiplier: settings.excessStockMultiplier }));
    next();
  } catch (err) {
    next(err);
  }
});

// Keeps low/critical/excess-stock Alert documents in sync with every save
// (creation, edits, manual stock movements, and the recalculation cron).
itemSchema.post('save', function syncAlerts(doc, next) {
  syncStockAlerts(doc, { session: doc.$session() })
    .then(() => next())
    .catch((err) => next(err));
});

export const Item = mongoose.model('Item', itemSchema);
