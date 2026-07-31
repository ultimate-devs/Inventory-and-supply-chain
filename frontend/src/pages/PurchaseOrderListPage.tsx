import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPurchaseOrders } from '../store/slices/purchaseOrdersSlice';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { ROLES } from '../types/auth';
import type { PurchaseOrder, PurchaseOrderStatus } from '../types/purchaseOrder';

type Tab = 'all' | 'pending' | 'shipped' | 'received';

const TAB_STATUSES: Record<Tab, PurchaseOrderStatus[] | null> = {
  all: null,
  pending: ['draft', 'submitted'],
  shipped: ['approved', 'sent', 'shipped'],
  received: ['partially_received', 'received'],
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'received', label: 'Received' },
];

const STATUS_TONE: Record<PurchaseOrderStatus, 'ok' | 'low' | 'critical' | 'excess' | 'neutral'> = {
  draft: 'neutral',
  submitted: 'low',
  approved: 'excess',
  rejected: 'critical',
  sent: 'excess',
  shipped: 'excess',
  partially_received: 'low',
  received: 'ok',
  cancelled: 'critical',
};

const supplierName = (supplier: PurchaseOrder['supplier']) => (typeof supplier === 'string' ? supplier : supplier.name);

const PurchaseOrderListPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { purchaseOrders, purchaseOrdersStatus, purchaseOrdersError } = useAppSelector((state) => state.purchaseOrders);
  const { user } = useAppSelector((state) => state.auth);
  const [tab, setTab] = useState<Tab>('all');

  const canCreate = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.PROCUREMENT_OFFICER;

  useEffect(() => {
    dispatch(fetchPurchaseOrders({ limit: 100 }));
  }, [dispatch]);

  const filtered = useMemo(() => {
    const statuses = TAB_STATUSES[tab];
    if (!statuses) return purchaseOrders;
    return purchaseOrders.filter((po) => statuses.includes(po.status));
  }, [purchaseOrders, tab]);

  const columns: TableColumn<PurchaseOrder>[] = [
    { key: 'poNumber', header: 'PO Number', render: (row) => <span className="font-medium">{row.poNumber}</span> },
    { key: 'supplier', header: 'Supplier', render: (row) => supplierName(row.supplier) },
    { key: 'total', header: 'Total Amount', render: (row) => row.totalAmount.toFixed(2) },
    { key: 'lines', header: 'Lines', render: (row) => row.lines.length },
    {
      key: 'expected',
      header: 'Expected Delivery',
      render: (row) => (row.expectedDeliveryDate ? new Date(row.expectedDeliveryDate).toLocaleDateString() : '-'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status.replace(/_/g, ' ')}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Purchase Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track orders from draft through to receipt.</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/purchase-orders/new')} className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            New Purchase Order
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Table
        columns={columns}
        rows={filtered}
        rowKey={(r) => r._id}
        isLoading={purchaseOrdersStatus === 'loading'}
        error={purchaseOrdersError}
        emptyMessage="No purchase orders in this view"
        onRowClick={(row) => navigate(`/purchase-orders/${row._id}`)}
      />
    </div>
  );
};

export default PurchaseOrderListPage;
