import mongoose from 'mongoose';

// Member 4 (Greedy Algorithm & Comparison): every allocation run - whether
// launched standalone or as part of a comparison - is saved here so the
// Greedy Algorithm History page can list past runs.

const candidateItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    name: { type: String, required: true },
    urgencyScore: { type: Number, required: true, min: 0, max: 100 },
    quantityNeeded: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    neededValue: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const allocationEntrySchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    name: { type: String, required: true },
    urgencyScore: { type: Number, required: true },
    allocatedAmount: { type: Number, required: true, min: 0 },
    allocatedQuantity: { type: Number, required: true, min: 0 },
    fractionCovered: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false },
);

const allocationResultSchema = new mongoose.Schema(
  {
    allocations: { type: [allocationEntrySchema], default: [] },
    totalAllocated: { type: Number, required: true, min: 0 },
    unallocatedBudget: { type: Number, required: true, min: 0 },
    itemsFullyCovered: { type: Number, required: true, min: 0 },
    itemsPartiallyCovered: { type: Number, required: true, min: 0 },
    itemsUncovered: { type: Number, required: true, min: 0 },
    weightedUrgencyServed: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const greedyRunSchema = new mongoose.Schema(
  {
    runBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    budget: { type: Number, required: true, min: 0 },
    itemsConsidered: { type: [candidateItemSchema], default: [] },
    greedyResult: { type: allocationResultSchema, required: true },
    proportionalResult: { type: allocationResultSchema, required: true },
  },
  { timestamps: true },
);

greedyRunSchema.index({ createdAt: -1 });
greedyRunSchema.index({ runBy: 1, createdAt: -1 });

export const GreedyRun = mongoose.model('GreedyRun', greedyRunSchema);
