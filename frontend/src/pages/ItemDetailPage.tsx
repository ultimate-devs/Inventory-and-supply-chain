import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, PackagePlus, PackageMinus, SlidersHorizontal } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchItemById, addStockMovement, clearSelectedItem } from '../store/slices/inventorySlice';
import { itemService } from '../services/inventoryService';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import type { MovementType, StockMovement } from '../types/inventory';

const MOVEMENT_META: Record<MovementType, { label: string; icon: typeof PackagePlus }> = {
  in: { label: 'Stock In', icon: PackagePlus },
  out: { label: 'Stock Out', icon: PackageMinus },
  adjustment: { label: 'Adjustment', icon: SlidersHorizontal },
};

const movementColumns: TableColumn<StockMovement>[] = [
  {
    key: 'type',
    header: 'Type',
    render: (row) => <span className="capitalize">{row.type}</span>,
  },
  { key: 'quantity', header: 'Quantity', render: (row) => row.quantity },
  { key: 'resultingStock', header: 'Resulting Stock', render: (row) => row.resultingStock },
  { key: 'reason', header: 'Reason', render: (row) => row.reason || '-' },
  { key: 'by', header: 'By', render: (row) => row.performedBy?.name ?? '-' },
  { key: 'when', header: 'When', render: (row) => new Date(row.createdAt).toLocaleString() },
];

const ItemDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedItem: item, selectedItemStatus, selectedItemError } = useAppSelector((state) => state.inventory);

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [modalType, setModalType] = useState<MovementType | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMovements = async (itemId: string) => {
    setMovementsLoading(true);
    try {
      const result = await itemService.listMovements(itemId);
      setMovements(result);
    } catch {
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    dispatch(fetchItemById(id));
    loadMovements(id);
    return () => {
      dispatch(clearSelectedItem());
    };
  }, [dispatch, id]);

  const openModal = (type: MovementType) => {
    setModalType(type);
    setQuantity('');
    setReason('');
    setFormError('');
  };

  const handleSubmitMovement = async (event: FormEvent) => {
    event.preventDefault();
    if (!id || !modalType) return;
    const qty = Number(quantity);
    if (!qty || (modalType !== 'adjustment' && qty <= 0)) {
      setFormError('Enter a valid quantity');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    const result = await dispatch(addStockMovement({ id, payload: { type: modalType, quantity: qty, reason } }));
    setIsSubmitting(false);

    if (addStockMovement.fulfilled.match(result)) {
      setModalType(null);
      loadMovements(id);
    } else {
      setFormError((result.payload as string) || 'Unable to record movement');
    }
  };

  if (selectedItemStatus === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (selectedItemError || !item) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-sm text-red-500">{selectedItemError || 'Item not found'}</p>
      </div>
    );
  }

  const categoryName = typeof item.category === 'string' ? item.category : item.category?.name;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/inventory')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Inventory
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{item.name}</h1>
            <Badge tone={item.stockStatus}>{item.stockStatus}</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            SKU: {item.sku} &middot; Category: {categoryName || '-'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => openModal('in')} className="inline-flex items-center gap-1.5">
            <PackagePlus className="h-4 w-4" />
            Stock In
          </Button>
          <Button variant="ghost" onClick={() => openModal('out')} className="inline-flex items-center gap-1.5">
            <PackageMinus className="h-4 w-4" />
            Stock Out
          </Button>
          <Button variant="ghost" onClick={() => openModal('adjustment')} className="inline-flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            Adjust
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Current Stock', item.currentStock],
          ['Safety Stock', item.safetyStock],
          ['Avg Daily Demand', item.avgDailyDemand.toFixed(2)],
          ['ROP (Simple)', Math.round(item.reorderPointSimple)],
          ['ROP (Probabilistic)', Math.round(item.reorderPointProbabilistic)],
          ['EOQ', Math.round(item.economicOrderQuantity)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Stock Movement History</h2>
        <Table
          columns={movementColumns}
          rows={movements}
          rowKey={(r) => r._id}
          isLoading={movementsLoading}
          emptyMessage="No stock movements recorded yet"
        />
      </div>

      <Modal open={modalType !== null} title={modalType ? MOVEMENT_META[modalType].label : ''} onClose={() => setModalType(null)}>
        <form onSubmit={handleSubmitMovement} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <Input
            id="quantity"
            label={modalType === 'adjustment' ? 'Quantity (+/-)' : 'Quantity'}
            icon={null}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input id="reason" label="Reason (optional)" icon={null} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Confirm'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ItemDetailPage;
