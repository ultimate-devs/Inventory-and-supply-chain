export type AlertType = 'low_stock' | 'critical_stock' | 'excess_stock' | 'overdue_po';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface Alert {
  _id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  item?: { _id: string; name: string; sku: string } | string;
  purchaseOrder?: { _id: string; poNumber: string } | string;
  supplier?: { _id: string; name: string } | string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AlertListQuery {
  page?: number;
  limit?: number;
  status?: AlertStatus;
  type?: AlertType;
}
