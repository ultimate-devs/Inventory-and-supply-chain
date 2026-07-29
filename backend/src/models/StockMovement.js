import mongoose from 'mongoose';

export const MOVEMENT_TYPES = Object.freeze({ IN: 'in', OUT: 'out', ADJUSTMENT: 'adjustment' });

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
