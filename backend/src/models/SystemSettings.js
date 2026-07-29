import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'default', unique: true },
    companyName: { type: String, default: 'My Company' },
    currency: { type: String, default: 'GBP' },
    defaultBudget: { type: Number, default: 0, min: 0 },
    lowStockThresholdPercent: { type: Number, default: 20, min: 0, max: 100 },
    criticalStockThresholdPercent: { type: Number, default: 10, min: 0, max: 100 },
    excessStockMultiplier: { type: Number, default: 3, min: 1 },
    defaultServiceLevel: { type: Number, enum: [90, 95, 99], default: 95 },
  },
  { timestamps: true },
);

systemSettingsSchema.statics.getSingleton = async function getSingleton() {
  let settings = await this.findOne({ singleton: 'default' });
  if (!settings) {
    settings = await this.create({ singleton: 'default' });
  }
  return settings;
};

export const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
