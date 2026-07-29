import type { Role } from './auth';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface UpdateUserPayload {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

export interface SystemSettings {
  _id: string;
  companyName: string;
  currency: string;
  defaultBudget: number;
  lowStockThresholdPercent: number;
  criticalStockThresholdPercent: number;
  excessStockMultiplier: number;
  defaultServiceLevel: 90 | 95 | 99;
}

export type UpdateSystemSettingsPayload = Partial<
  Omit<SystemSettings, '_id'>
>;
