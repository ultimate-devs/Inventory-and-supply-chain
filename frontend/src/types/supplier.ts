export type SupplierStatus = 'pending' | 'approved' | 'suspended';

export interface CatalogueEntry {
  item: { _id: string; name: string; sku: string; currentStock?: number } | string;
  supplierSku?: string;
  unitPrice: number;
  leadTimeDays: number;
}

export interface ScoreHistoryEntry {
  date: string;
  onTimeRate: number;
  accuracyRate: number;
  leadTimeReliability: number;
  priceConsistency: number;
  overallScore: number;
}

export interface SupplierStats {
  totalDeliveries: number;
  onTimeDeliveries: number;
  totalReceivedLines: number;
  accurateReceivedLines: number;
  leadTimeDeviationSum: number;
  leadTimeSampleCount: number;
  priceDeviationSum: number;
  priceSampleCount: number;
}

export interface Supplier {
  _id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  itemsCatalogue: CatalogueEntry[];
  scoreHistory: ScoreHistoryEntry[];
  stats: SupplierStats;
  onTimeRate: number;
  accuracyRate: number;
  leadTimeReliability: number;
  priceConsistency: number;
  performanceScore: number;
  status: SupplierStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;

export interface CatalogueEntryPayload {
  item: string;
  supplierSku?: string;
  unitPrice: number;
  leadTimeDays: number;
}

export interface SupplierListQuery {
  page?: number;
  limit?: number;
  status?: SupplierStatus;
  search?: string;
  sortBy?: 'name' | 'performanceScore';
}

export interface RankedSupplierCandidate {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  leadTimeDays: number;
  performanceScore: number;
  status: SupplierStatus;
  priceScore: number;
  leadTimeScore: number;
  compositeScore: number;
}

export type SupplierSelectionStatus = 'success' | 'no_supplier_available';

export interface SupplierRecommendation {
  status: SupplierSelectionStatus;
  ranked: RankedSupplierCandidate[];
  recommended: RankedSupplierCandidate | null;
}
