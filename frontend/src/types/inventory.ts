export type StockStatus = 'critical' | 'low' | 'ok' | 'excess';

export interface Category {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DemandEntry {
  date: string;
  quantity: number;
}

export interface Item {
  _id: string;
  name: string;
  sku: string;
  description?: string;
  category: Category | string;

  unitCost: number;
  currentStock: number;

  leadTimeDays: number;
  orderingCost: number;
  holdingCostPerUnit: number;
  safetyStock: number;
  serviceLevel: 90 | 95 | 99;

  dailyDemandHistory: DemandEntry[];

  avgDailyDemand: number;
  demandStdDev: number;
  reorderPointSimple: number;
  reorderPointProbabilistic: number;
  economicOrderQuantity: number;
  stockStatus: StockStatus;
  lastCalculatedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export type MovementType = 'in' | 'out' | 'adjustment';

export interface StockMovement {
  _id: string;
  item: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  resultingStock: number;
  performedBy?: { _id: string; name: string; email: string };
  createdAt: string;
}

export interface CreateItemPayload {
  name: string;
  sku: string;
  description?: string;
  category: string;
  unitCost: number;
  currentStock?: number;
  leadTimeDays?: number;
  orderingCost?: number;
  holdingCostPerUnit?: number;
  safetyStock?: number;
  serviceLevel?: 90 | 95 | 99;
}

export type UpdateItemPayload = Partial<CreateItemPayload>;

export interface StockMovementPayload {
  type: MovementType;
  quantity: number;
  reason?: string;
}

export interface ItemListQuery {
  page?: number;
  limit?: number;
  category?: string;
  stockStatus?: StockStatus;
  search?: string;
  sortBy?: 'name' | 'currentStock' | 'stockStatus' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
