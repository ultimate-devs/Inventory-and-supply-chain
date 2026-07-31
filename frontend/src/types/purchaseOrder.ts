export type PurchaseOrderStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'shipped'
  | 'partially_received'
  | 'received'
  | 'cancelled';

export interface PurchaseOrderLine {
  item: { _id: string; name: string; sku: string; currentStock?: number } | string;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
}

export interface StatusHistoryEntry {
  status: PurchaseOrderStatus;
  changedBy?: { _id: string; name: string; email: string } | string;
  changedAt: string;
  note?: string;
}

export interface ApprovalEntry {
  level: number;
  approver: { _id: string; name: string; email: string } | string;
  decision: 'approved' | 'rejected';
  note?: string;
  decidedAt: string;
}

export interface DiscrepancyEntry {
  item: string;
  orderedQuantity: number;
  receivedQuantity: number;
  type: 'under_delivery' | 'over_delivery';
  variance: number;
  recordedAt: string;
}

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplier: { _id: string; name: string; performanceScore: number; status: string } | string;
  requestedBy: { _id: string; name: string; email: string } | string;
  recommendedSupplier: boolean;
  lines: PurchaseOrderLine[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  statusHistory: StatusHistoryEntry[];
  requiresSecondApproval: boolean;
  approvals: ApprovalEntry[];
  discrepancies: DiscrepancyEntry[];
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderLinePayload {
  item: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseOrderPayload {
  supplier: string;
  lines: CreatePurchaseOrderLinePayload[];
  expectedDeliveryDate?: string;
  recommendedSupplier?: boolean;
}

export interface PurchaseOrderListQuery {
  page?: number;
  limit?: number;
  status?: PurchaseOrderStatus;
  supplier?: string;
  from?: string;
  to?: string;
}

export interface ReceiveGoodsLinePayload {
  item: string;
  receivedQuantity: number;
}

export interface ReceiveGoodsPayload {
  version: number;
  lines: ReceiveGoodsLinePayload[];
}

export interface ReceiveGoodsResult {
  purchaseOrder: PurchaseOrder;
  supplier: { _id: string; performanceScore: number; stats: Record<string, number> } | null;
}
