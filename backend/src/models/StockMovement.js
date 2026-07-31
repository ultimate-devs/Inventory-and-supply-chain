import mongoose from 'mongoose';

// IN/OUT/ADJUSTMENT are the original Phase-1 manual movement types.
// Phase 2 adds RECEIPT (goods received against a PO), CONSUMPTION (outflow that
// also feeds dailyDemandHistory for ROP/EOQ), and DAMAGE (written-off stock).
export const MOVEMENT_TYPES = Object.freeze({
  IN: 'in',
  OUT: 'out',
  ADJUSTMENT: 'adjustment',
  RECEIPT: 'receipt',
  CONSUMPTION: 'consumption',
  DAMAGE: 'damage',
});

// Movement types whose quantity is a positive magnitude that increases stock.
export const INCREASING_TYPES = new Set([MOVEMENT_TYPES.IN, MOVEMENT_TYPES.RECEIPT]);
// Movement types whose quantity is a positive magnitude that decreases stock.
export const DECREASING_TYPES = new Set([MOVEMENT_TYPES.OUT, MOVEMENT_TYPES.CONSUMPTION, MOVEMENT_TYPES.DAMAGE]);

const stockMovementSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    type: { type: String, enum: Object.values(MOVEMENT_TYPES), required: true },
    quantity: { type: Number, required: true },
    reason: { type: String, trim: true, maxlength: 300 },
    resultingStock: { type: Number, required: true, min: 0 },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockMovementSchema.index({ item: 1, createdAt: -1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
