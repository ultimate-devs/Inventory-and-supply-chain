import type { StockStatus } from './inventory';

export interface DashboardKpis {
  totalItems: number;
  totalInventoryValue: number;
  criticalItemCount: number;
  lowItemCount: number;
  excessItemCount: number;
  pendingOrders: number;
}

export interface CategoryStockBreakdown {
  categoryId: string;
  categoryName: string;
  totalStock: number;
  totalReorderPoint: number;
  itemCount: number;
}

export interface CriticalItem {
  _id: string;
  name: string;
  sku: string;
  currentStock: number;
  safetyStock: number;
  reorderPointProbabilistic: number;
  stockStatus: StockStatus;
  category: { _id: string; name: string };
}

export interface ActivityEntry {
  _id: string;
  action: string;
  target?: string;
  statusCode?: number;
  actor?: { _id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface DashboardData {
  kpis: DashboardKpis;
  stockVsReorderByCategory: CategoryStockBreakdown[];
  criticalItems: CriticalItem[];
  recentActivity: ActivityEntry[];
}
