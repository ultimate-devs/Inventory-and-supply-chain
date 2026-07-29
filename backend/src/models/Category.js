import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

categorySchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

categorySchema.pre(/^find/, function excludeSoftDeleted(next) {
  if (this.getFilter().includeDeleted) {
    delete this.getFilter().includeDeleted;
    return next();
  }
  this.where({ isDeleted: { $ne: true } });
  next();
});

export const Category = mongoose.model('Category', categorySchema);
