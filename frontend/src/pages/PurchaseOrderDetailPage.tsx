import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, PackageCheck } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchPurchaseOrderById,
  clearSelectedPurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  sendPurchaseOrder,
  shipPurchaseOrder,
  cancelPurchaseOrder,
  receiveGoods,
} from '../store/slices/purchaseOrdersSlice';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import { ROLES } from '../types/auth';
import type { PurchaseOrderLine, PurchaseOrderStatus } from '../types/purchaseOrder';

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

const nameOf = (value: { name: string } | string) => (typeof value === 'string' ? value : value.name);

const PurchaseOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedPurchaseOrder: po, selectedPurchaseOrderStatus, selectedPurchaseOrderError } = useAppSelector(
    (state) => state.purchaseOrders,
  );
  const { user } = useAppSelector((state) => state.auth);

  const [actionError, setActionError] = useState('');
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});
  const [isSubmittingReceive, setIsSubmittingReceive] = useState(false);

  const canRequest = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.PROCUREMENT_OFFICER;
  const canApprove = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.INVENTORY_MANAGER;

  useEffect(() => {
    if (!id) return;
    dispatch(fetchPurchaseOrderById(id));
    return () => {
      dispatch(clearSelectedPurchaseOrder());
    };
  }, [dispatch, id]);

  if (selectedPurchaseOrderStatus === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (selectedPurchaseOrderError || !po) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-sm text-red-500">{selectedPurchaseOrderError || 'Purchase order not found'}</p>
      </div>
    );
  }

  const runAction = async (pending: Promise<{ meta: { requestStatus: string }; payload?: unknown }>) => {
    setActionError('');
    const result = await pending;
    if (result.meta.requestStatus === 'rejected') {
      setActionError((result.payload as string) || 'Action failed');
    }
  };

  const openReceiveModal = () => {
    const defaults: Record<string, string> = {};
    po.lines.forEach((line) => {
      const itemId = typeof line.item === 'string' ? line.item : line.item._id;
      const remaining = Math.max(0, line.quantity - line.receivedQuantity);
      if (remaining > 0) defaults[itemId] = String(remaining);
    });
    setReceiveQuantities(defaults);
    setActionError('');
    setReceiveModalOpen(true);
  };

  const handleReceive = async () => {
    const lines = Object.entries(receiveQuantities)
      .map(([item, qty]) => ({ item, receivedQuantity: Number(qty) || 0 }))
      .filter((l) => l.receivedQuantity > 0);

    if (lines.length === 0) {
      setActionError('Enter at least one received quantity');
      return;
    }

    setIsSubmittingReceive(true);
    const result = await dispatch(receiveGoods({ id: po._id, payload: { version: po.version, lines } }));
    setIsSubmittingReceive(false);
    if (receiveGoods.fulfilled.match(result)) {
      setReceiveModalOpen(false);
    } else {
      setActionError((result.payload as string) || 'Unable to record goods receipt');
    }
  };

  const lineColumns: TableColumn<PurchaseOrderLine>[] = [
    { key: 'item', header: 'Item', render: (row) => nameOf(row.item) },
    { key: 'quantity', header: 'Ordered', render: (row) => row.quantity },
    { key: 'received', header: 'Received', render: (row) => row.receivedQuantity },
    { key: 'unitPrice', header: 'Unit Price', render: (row) => row.unitPrice.toFixed(2) },
    { key: 'lineTotal', header: 'Line Total', render: (row) => (row.quantity * row.unitPrice).toFixed(2) },
  ];

  const isReceivable = ['sent', 'shipped', 'partially_received'].includes(po.status);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/purchase-orders')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Purchase Orders
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{po.poNumber}</h1>
            <Badge tone={STATUS_TONE[po.status]}>{po.status.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Supplier: {nameOf(po.supplier)} &middot; Total: {po.totalAmount.toFixed(2)}
            {po.requiresSecondApproval ? ' · Requires two-level approval' : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {po.status === 'draft' && canRequest && (
            <Button onClick={() => runAction(dispatch(submitPurchaseOrder({ id: po._id, version: po.version })))}>
              Submit for Approval
            </Button>
          )}
          {po.status === 'submitted' && canApprove && (
            <>
              <Button onClick={() => runAction(dispatch(approvePurchaseOrder({ id: po._id, version: po.version })))}>
                Approve
              </Button>
              <Button
                variant="ghost"
                onClick={() => runAction(dispatch(rejectPurchaseOrder({ id: po._id, version: po.version })))}
              >
                Reject
              </Button>
            </>
          )}
          {po.status === 'approved' && canRequest && (
            <Button onClick={() => runAction(dispatch(sendPurchaseOrder({ id: po._id, version: po.version })))}>
              Mark Sent to Supplier
            </Button>
          )}
          {po.status === 'sent' && canRequest && (
            <Button
              variant="ghost"
              onClick={() => runAction(dispatch(shipPurchaseOrder({ id: po._id, version: po.version })))}
            >
              Mark Shipped
            </Button>
          )}
          {isReceivable && canRequest && (
            <Button onClick={openReceiveModal} className="inline-flex items-center gap-1.5">
              <PackageCheck className="h-4 w-4" />
              Receive Goods
            </Button>
          )}
          {['draft', 'submitted', 'approved', 'sent', 'shipped'].includes(po.status) && canRequest && (
            <Button
              variant="ghost"
              onClick={() => runAction(dispatch(cancelPurchaseOrder({ id: po._id, version: po.version })))}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Line Items</h2>
        <Table columns={lineColumns} rows={po.lines} rowKey={(r) => (typeof r.item === 'string' ? r.item : r.item._id)} />
      </div>

      {po.discrepancies.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Discrepancies</h2>
          <ul className="space-y-2">
            {po.discrepancies.map((d, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
              >
                {d.type === 'under_delivery' ? 'Under-delivery' : 'Over-delivery'}: ordered {d.orderedQuantity}, received{' '}
                {d.receivedQuantity} (variance {d.variance > 0 ? '+' : ''}
                {d.variance})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Status Timeline</h2>
        <ol className="space-y-2 border-l-2 border-slate-200 pl-4 dark:border-slate-800">
          {po.statusHistory.map((entry, idx) => (
            <li key={idx} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary-500" />
              <p className="text-sm font-medium capitalize text-slate-900 dark:text-slate-100">
                {entry.status.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(entry.changedAt).toLocaleString()}
                {entry.note ? ` · ${entry.note}` : ''}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <Modal open={receiveModalOpen} title="Receive Goods" onClose={() => setReceiveModalOpen(false)}>
        <div className="space-y-4">
          {actionError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {po.lines.map((line) => {
            const itemId = typeof line.item === 'string' ? line.item : line.item._id;
            const remaining = Math.max(0, line.quantity - line.receivedQuantity);
            if (remaining <= 0) return null;
            return (
              <Input
                key={itemId}
                id={`receive-${itemId}`}
                label={`${nameOf(line.item)} (ordered ${line.quantity}, received ${line.receivedQuantity})`}
                icon={null}
                type="number"
                value={receiveQuantities[itemId] ?? ''}
                onChange={(e) => setReceiveQuantities({ ...receiveQuantities, [itemId]: e.target.value })}
              />
            );
          })}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setReceiveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isSubmittingReceive} onClick={handleReceive}>
              {isSubmittingReceive ? 'Recording...' : 'Confirm Receipt'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PurchaseOrderDetailPage;
