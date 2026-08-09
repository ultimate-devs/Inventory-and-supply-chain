import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Plus, Trash2, CheckCircle2, Ban } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchSupplierById,
  clearSelectedSupplier,
  setSupplierStatus,
  upsertCatalogueEntry,
  removeCatalogueEntry,
} from '../store/slices/suppliersSlice';
import { fetchItems } from '../store/slices/inventorySlice';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import { ROLES } from '../types/auth';
import type { CatalogueEntry, SupplierStatus } from '../types/supplier';

const STATUS_TONE: Record<SupplierStatus, 'ok' | 'low' | 'critical'> = {
  approved: 'ok',
  pending: 'low',
  suspended: 'critical',
};

const SCORE_TILES: Array<{ key: 'performanceScore' | 'onTimeRate' | 'accuracyRate' | 'leadTimeReliability' | 'priceConsistency'; label: string }> = [
  { key: 'performanceScore', label: 'Overall Score' },
  { key: 'onTimeRate', label: 'On-Time Rate' },
  { key: 'accuracyRate', label: 'Accuracy Rate' },
  { key: 'leadTimeReliability', label: 'Lead-Time Reliability' },
  { key: 'priceConsistency', label: 'Price Consistency' },
];

const emptyCatalogueForm = { item: '', supplierSku: '', unitPrice: '', leadTimeDays: '' };

const SupplierDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedSupplier: supplier, selectedSupplierStatus, selectedSupplierError } = useAppSelector(
    (state) => state.suppliers,
  );
  const { items } = useAppSelector((state) => state.inventory);
  const { user } = useAppSelector((state) => state.auth);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyCatalogueForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.PROCUREMENT_OFFICER;

  useEffect(() => {
    if (!id) return;
    dispatch(fetchSupplierById(id));
    dispatch(fetchItems({ limit: 100 }));
    return () => {
      dispatch(clearSelectedSupplier());
    };
  }, [dispatch, id]);

  if (selectedSupplierStatus === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (selectedSupplierError || !supplier) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-sm text-red-500">{selectedSupplierError || 'Supplier not found'}</p>
      </div>
    );
  }

  const trendData = supplier.scoreHistory.map((entry) => ({
    date: new Date(entry.date).toLocaleDateString(),
    score: Math.round(entry.overallScore),
  }));

  const handleAddCatalogueEntry = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.item || !form.unitPrice || !form.leadTimeDays) {
      setFormError('Item, unit price, and lead time are required');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    const result = await dispatch(
      upsertCatalogueEntry({
        id: supplier._id,
        payload: {
          item: form.item,
          supplierSku: form.supplierSku || undefined,
          unitPrice: Number(form.unitPrice),
          leadTimeDays: Number(form.leadTimeDays),
        },
      }),
    );
    setIsSubmitting(false);
    if (upsertCatalogueEntry.fulfilled.match(result)) {
      setIsModalOpen(false);
      setForm(emptyCatalogueForm);
    } else {
      setFormError((result.payload as string) || 'Unable to save catalogue entry');
    }
  };

  const catalogueColumns: TableColumn<CatalogueEntry>[] = [
    {
      key: 'item',
      header: 'Item',
      render: (row) => (typeof row.item === 'string' ? row.item : `${row.item.name} (${row.item.sku})`),
    },
    { key: 'sku', header: 'Supplier SKU', render: (row) => row.supplierSku || '-' },
    { key: 'price', header: 'Unit Price', render: (row) => row.unitPrice.toFixed(2) },
    { key: 'leadTime', header: 'Lead Time (days)', render: (row) => row.leadTimeDays },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            render: (row: CatalogueEntry) => {
              const itemId = typeof row.item === 'string' ? row.item : row.item._id;
              return (
                <button
                  onClick={() => dispatch(removeCatalogueEntry({ id: supplier._id, itemId }))}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                  aria-label="Remove catalogue entry"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/suppliers')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Suppliers
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{supplier.name}</h1>
            <Badge tone={STATUS_TONE[supplier.status]}>{supplier.status}</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {supplier.contactEmail || supplier.contactName || 'No contact details on file'}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {supplier.status !== 'approved' && (
              <Button
                variant="ghost"
                className="inline-flex items-center gap-1.5"
                onClick={() => dispatch(setSupplierStatus({ id: supplier._id, status: 'approved' }))}
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
            )}
            {supplier.status !== 'suspended' && (
              <Button
                variant="ghost"
                className="inline-flex items-center gap-1.5"
                onClick={() => dispatch(setSupplierStatus({ id: supplier._id, status: 'suspended' }))}
              >
                <Ban className="h-4 w-4" />
                Suspend
              </Button>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Performance Breakdown</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {SCORE_TILES.map(({ key, label }) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{Math.round(supplier[key])}</p>
            </div>
          ))}
        </div>
      </div>

      {trendData.length > 1 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Score Trend</h2>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-slate-500" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} className="fill-slate-500" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
                <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Item Catalogue</h2>
          {canManage && (
            <Button
              variant="ghost"
              className="inline-flex items-center gap-1.5"
              onClick={() => {
                setForm(emptyCatalogueForm);
                setFormError('');
                setIsModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          )}
        </div>
        <Table
          columns={catalogueColumns}
          rows={supplier.itemsCatalogue}
          rowKey={(r) => (typeof r.item === 'string' ? r.item : r.item._id)}
          emptyMessage="No items in this supplier's catalogue yet"
        />
      </div>

      <Modal open={isModalOpen} title="Add Catalogue Item" onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleAddCatalogueEntry} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Item</label>
            <select
              value={form.item}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="" disabled>
                Select an item
              </option>
              {items.map((i) => (
                <option key={i._id} value={i._id}>
                  {i.name} ({i.sku})
                </option>
              ))}
            </select>
          </div>
          <Input id="supplierSku" label="Supplier SKU (optional)" icon={null} value={form.supplierSku} onChange={(e) => setForm({ ...form, supplierSku: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="unitPrice" label="Unit Price" icon={null} type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
            <Input id="leadTimeDays" label="Lead Time (days)" icon={null} type="number" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SupplierDetailPage;
