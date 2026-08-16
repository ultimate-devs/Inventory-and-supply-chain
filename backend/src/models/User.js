import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ALL_ROLES, ROLES } from '../config/roles.js';

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdByIp: { type: String },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ALL_ROLES, default: ROLES.ANALYST },
    isActive: { type: Boolean, default: true },
    // Marks the small set of headless accounts the ADK agents/ service logs
    // in as, so audit trails and the future Agent Insights UI can tell an
    // agent-driven action apart from a human one at a glance.
    isServiceAccount: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    // Set when an admin creates the account (see userController.createUser):
    // the user must change their emailed temp password before using the app,
    // and that temp password stops working after tempPasswordExpires.
    mustChangePassword: { type: Boolean, default: false },
    tempPasswordExpires: { type: Date, select: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.pre(/^find/, function excludeSoftDeleted(next) {
  if (this.getFilter().includeDeleted) {
    delete this.getFilter().includeDeleted;
    return next();
  }
  this.where({ isDeleted: { $ne: true } });
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    isServiceAccount: this.isServiceAccount,
    mustChangePassword: this.mustChangePassword,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 12);

export const User = mongoose.model('User', userSchema);
