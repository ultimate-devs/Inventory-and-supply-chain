import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, Check, CheckCheck, ShoppingCart } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAlerts, acknowledgeAlert, resolveAlert } from '../store/slices/alertsSlice';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import AgentRunButton from '../components/agents/AgentRunButton';
import { ROLES } from '../types/auth';
import type { Alert, AlertSeverity, AlertStatus } from '../types/alert';

const STOCK_ALERT_TYPES = new Set(['low_stock', 'critical_stock']);

type Tab = 'all' | AlertStatus;

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'resolved', label: 'Resolved' },
];

const SEVERITY_TONE: Record<AlertSeverity, 'ok' | 'low' | 'critical' | 'excess' | 'neutral'> = {
  info: 'excess',
  warning: 'low',
  critical: 'critical',
};

const STATUS_TONE: Record<AlertStatus, 'ok' | 'low' | 'critical' | 'excess' | 'neutral'> = {
  open: 'critical',
  acknowledged: 'low',
  resolved: 'ok',
};

const relatedLink = (alert: Alert): { label: string; to: string } | null => {
  if (alert.item) {
    const id = typeof alert.item === 'string' ? alert.item : alert.item._id;
    const label = typeof alert.item === 'string' ? 'View item' : alert.item.name;
    return { label, to: `/inventory/${id}` };
  }
  if (alert.purchaseOrder) {
    const id = typeof alert.purchaseOrder === 'string' ? alert.purchaseOrder : alert.purchaseOrder._id;
    const label = typeof alert.purchaseOrder === 'string' ? 'View PO' : alert.purchaseOrder.poNumber;
    return { label, to: `/purchase-orders/${id}` };
  }
  if (alert.supplier) {
    const id = typeof alert.supplier === 'string' ? alert.supplier : alert.supplier._id;
    const label = typeof alert.supplier === 'string' ? 'View supplier' : alert.supplier.name;
    return { label, to: `/suppliers/${id}` };
  }
  return null;
};

const AlertsPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { alerts, alertsStatus, alertsError } = useAppSelector((state) => state.alerts);
  const currentUser = useAppSelector((state) => state.auth.user);
  const canDraftPo = currentUser?.role === ROLES.SUPER_ADMIN || currentUser?.role === ROLES.PROCUREMENT_OFFICER;
  const [tab, setTab] = useState<Tab>('open');

  useEffect(() => {
    dispatch(fetchAlerts({ limit: 100, status: tab === 'all' ? undefined : tab }));
  }, [dispatch, tab]);

  const rows = useMemo(() => alerts, [alerts]);

  const columns: TableColumn<Alert>[] = [
    { key: 'date', header: 'Raised', render: (row) => new Date(row.createdAt).toLocaleString() },
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => <Badge tone={SEVERITY_TONE[row.severity]}>{row.severity}</Badge>,
    },
    { key: 'type', header: 'Type', render: (row) => row.type.replace(/_/g, ' ') },
    { key: 'message', header: 'Message', className: 'max-w-lg', render: (row) => row.message },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>,
    },
    {
      key: 'related',
      header: 'Related',
      render: (row) => {
        const link = relatedLink(row);
        if (!link) return <span className="text-slate-400">-</span>;
        return (
          <button
            onClick={() => navigate(link.to)}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {link.label}
          </button>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const itemId = row.item && typeof row.item !== 'string' ? row.item._id : typeof row.item === 'string' ? row.item : null;
        const itemLabel = row.item && typeof row.item !== 'string' ? row.item.name : 'this item';
        const canDraft = canDraftPo && itemId && STOCK_ALERT_TYPES.has(row.type);

        return (
          <div className="flex items-center gap-2">
            {row.status === 'open' && (
              <Button variant="ghost" onClick={() => dispatch(acknowledgeAlert(row._id))} className="inline-flex items-center gap-1.5 px-2.5 py-1.5">
                <Check className="h-3.5 w-3.5" />
                Acknowledge
              </Button>
            )}
            {row.status !== 'resolved' && (
              <Button variant="ghost" onClick={() => dispatch(resolveAlert(row._id))} className="inline-flex items-center gap-1.5 px-2.5 py-1.5">
                <CheckCheck className="h-3.5 w-3.5" />
                Resolve
              </Button>
            )}
            {canDraft && (
              <AgentRunButton
                agentType="procurement"
                label="Draft PO"
                modalTitle="Procurement Agent"
                icon={<ShoppingCart className="h-3.5 w-3.5" />}
                className="px-2.5 py-1.5"
                buildPayload={() => ({
                  message: `Item "${itemLabel}" (id ${itemId}) is low on stock: "${row.message}". Recommend a supplier for this item and, if one is available, draft and submit a purchase order for review.`,
                  action: 'draft_po',
                  relatedModel: 'Item',
                  relatedId: itemId as string,
                })}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400">
          <BellRing className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Alerts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Stock, purchase order, and delivery alerts across the system.
          </p>
        </div>
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
        rows={rows}
        rowKey={(r) => r._id}
        isLoading={alertsStatus === 'loading'}
        error={alertsError}
        emptyMessage="No alerts in this view"
      />
    </div>
  );
};

export default AlertsPage;
