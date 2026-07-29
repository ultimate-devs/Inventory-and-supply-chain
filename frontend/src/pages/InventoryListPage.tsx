import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCategories, fetchItems, createItem } from '../store/slices/inventorySlice';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import type { Item, StockStatus } from '../types/inventory';

const STATUS_OPTIONS: { value: StockStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'critical', label: 'Critical' },
  { value: 'low', label: 'Low' },
  { value: 'ok', label: 'OK' },
  { value: 'excess', label: 'Excess' },
];

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  unitCost: '',
  currentStock: '',
  leadTimeDays: '',
  orderingCost: '',
  holdingCostPerUnit: '',
  safetyStock: '',
};

const InventoryListPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, itemsStatus, itemsError, categories } = useAppSelector((state) => state.inventory);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState<StockStatus | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      dispatch(
        fetchItems({
          search: search || undefined,
          category: category || undefined,
          stockStatus: stockStatus || undefined,
        }),
      );
    }, 300);
    return () => window.clearTimeout(handle);
  }, [dispatch, search, category, stockStatus]);

  const openCreateModal = () => {
    setForm({ ...emptyForm, category: categories[0]?._id ?? '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.sku.trim() || !form.category || !form.unitCost) {
      setFormError('Name, SKU, category, and unit cost are required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    const result = await dispatch(
      createItem({
        name: form.name,
        sku: form.sku,
        category: form.category,
        unitCost: Number(form.unitCost),
        currentStock: form.currentStock ? Number(form.currentStock) : undefined,
        leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : undefined,
        orderingCost: form.orderingCost ? Number(form.orderingCost) : undefined,
        holdingCostPerUnit: form.holdingCostPerUnit ? Number(form.holdingCostPerUnit) : undefined,
        safetyStock: form.safetyStock ? Number(form.safetyStock) : undefined,
      }),
    );
    setIsSubmitting(false);

    if (createItem.fulfilled.match(result)) {
      setIsModalOpen(false);
    } else {
      setFormError((result.payload as string) || 'Unable to create item');
    }
  };

  const columns: TableColumn<Item>[] = [
    { key: 'name', header: 'Item', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'sku', header: 'SKU', render: (row) => row.sku },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (typeof row.category === 'string' ? row.category : row.category?.name ?? '-'),
    },
    { key: 'stock', header: 'Stock', render: (row) => row.currentStock },
    { key: 'rop', header: 'Reorder Point', render: (row) => Math.round(row.reorderPointProbabilistic) },
    { key: 'eoq', header: 'EOQ', render: (row) => Math.round(row.economicOrderQuantity) },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={row.stockStatus}>{row.stockStatus}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Inventory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Search, filter, and manage items.</p>
        </div>
        <Button onClick={openCreateModal} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          New Item
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={stockStatus}
          onChange={(e) => setStockStatus(e.target.value as StockStatus | '')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <Table
        columns={columns}
        rows={items}
        rowKey={(r) => r._id}
        isLoading={itemsStatus === 'loading'}
        error={itemsError}
        emptyMessage="No items match your filters"
        onRowClick={(row) => navigate(`/inventory/${row._id}`)}
      />

      <Modal open={isModalOpen} title="New Item" onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <Input id="name" label="Name" icon={null} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input id="sku" label="SKU" icon={null} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="unitCost" label="Unit Cost" icon={null} type="number" step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
            <Input id="currentStock" label="Current Stock" icon={null} type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
            <Input id="leadTimeDays" label="Lead Time (days)" icon={null} type="number" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} />
            <Input id="safetyStock" label="Safety Stock" icon={null} type="number" value={form.safetyStock} onChange={(e) => setForm({ ...form, safetyStock: e.target.value })} />
            <Input id="orderingCost" label="Ordering Cost" icon={null} type="number" step="0.01" value={form.orderingCost} onChange={(e) => setForm({ ...form, orderingCost: e.target.value })} />
            <Input id="holdingCostPerUnit" label="Holding Cost/Unit" icon={null} type="number" step="0.01" value={form.holdingCostPerUnit} onChange={(e) => setForm({ ...form, holdingCostPerUnit: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InventoryListPage;
