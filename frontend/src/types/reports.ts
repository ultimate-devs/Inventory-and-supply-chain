export interface StockTurnoverRow {
  itemId: string;
  name: string;
  sku: string;
  category: string | null;
  annualDemand: number;
  avgStock: number;
  turnoverRatio: number;
}

export interface StockStatusCount {
  stockStatus: string;
  count: number;
}

export interface StockStatusByCategory {
  category: string;
  stockStatus: string;
  count: number;
}

export interface StockStatusBreakdownData {
  byStatus: StockStatusCount[];
  byCategory: StockStatusByCategory[];
}

export interface AlgorithmMethodSummary {
  totalAllocated: number;
  itemsFullyCovered: number;
  itemsPartiallyCovered: number;
  itemsUncovered: number;
  weightedUrgencyServed: number;
  budgetUtilisationPct: number;
}

export interface AlgorithmComparisonRow {
  runId: string;
  createdAt: string;
  budget: number;
  runBy: string | null;
  greedy: AlgorithmMethodSummary;
  proportional: AlgorithmMethodSummary;
  ilp: AlgorithmMethodSummary | null;
}

export interface BudgetUtilisationPoint {
  runId: string;
  createdAt: string;
  budget: number;
  greedyUtilisationPct: number;
  proportionalUtilisationPct: number;
  ilpUtilisationPct: number | null;
}

export interface SupplierPerformanceRow {
  supplierId: string;
  name: string;
  onTimeRate: number;
  accuracyRate: number;
  leadTimeReliability: number;
  priceConsistency: number;
  performanceScore: number;
}

export interface PoPipelineStatusCount {
  status: string;
  count: number;
}

export interface PoLeadTimeBySupplier {
  supplierId: string;
  supplierName: string;
  avgLeadTimeDays: number;
  minLeadTimeDays: number;
  maxLeadTimeDays: number;
  receivedCount: number;
}

export interface PoPipelineData {
  pipeline: PoPipelineStatusCount[];
  leadTimeBySupplier: PoLeadTimeBySupplier[];
}

export interface CategorySpendRow {
  categoryId: string;
  category: string | null;
  committedSpend: number;
  receivedSpend: number;
  lineCount: number;
}
