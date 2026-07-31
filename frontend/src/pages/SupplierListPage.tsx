import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, AlertCircle, CheckCircle2, Ban } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSuppliers, createSupplier, setSupplierStatus } from '../store/slices/suppliersSlice';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ROLES } from '../types/auth';
import type { Supplier, SupplierStatus } from '../types/supplier';

const STATUS_OPTIONS: { value: SupplierStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'suspended', label: 'Suspended' },
];

const STATUS_TONE: Record<SupplierStatus, 'ok' | 'low' | 'critical'> = {
  approved: 'ok',
  pending: 'low',
  suspended: 'critical',
};

const emptyForm = { name: '', contactName: '', contactEmail: '', contactPhone: '', address: '' };

const SupplierListPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { suppliers, suppliersStatus, suppliersError } = useAppSelector((state) => state.suppliers);
  const { user } = useAppSelector((state) => state.auth);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SupplierStatus | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.PROCUREMENT_OFFICER;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      dispatch(fetchSuppliers({ search: search || undefined, status: status || undefined, sortBy: 'performanceScore' }));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [dispatch, search, status]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    const result = await dispatch(createSupplier(form));
    setIsSubmitting(false);
    if (createSupplier.fulfilled.match(result)) {
      setIsModalOpen(false);
      setForm(emptyForm);
    } else {
      setFormError((result.payload as string) || 'Unable to create supplier');
    }
  };

  const handleStatusChange = (id: string, next: 'approved' | 'suspended', event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch(setSupplierStatus({ id, status: next }));
  };

  const columns: TableColumn<Supplier>[] = [
    { key: 'name', header: 'Supplier', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'contact', header: 'Contact', render: (row) => row.contactEmail || row.contactName || '-' },
    {
      key: 'score',
      header: 'Performance Score',
      render: (row) => <span className="font-semibold">{Math.round(row.performanceScore)}</span>,
    },
    { key: 'onTime', header: 'On-Time Rate', render: (row) => `${Math.round(row.onTimeRate)}%` },
    { key: 'items', header: 'Catalogue Size', render: (row) => row.itemsCatalogue.length },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge> },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (row: Supplier) => (
              <div className="flex gap-2">
                {row.status !== 'approved' && (
                  <button
                    onClick={(e) => handleStatusChange(row._id, 'approved', e)}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve
                  </button>
                )}
                {row.status !== 'suspended' && (
                  <button
                    onClick={(e) => handleStatusChange(row._id, 'suspended', e)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Suspend
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Suppliers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage suppliers, catalogues, and performance scores.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            New Supplier
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as SupplierStatus | '')}
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
        rows={suppliers}
        rowKey={(r) => r._id}
        isLoading={suppliersStatus === 'loading'}
        error={suppliersError}
        emptyMessage="No suppliers match your filters"
        onRowClick={(row) => navigate(`/suppliers/${row._id}`)}
      />

      <Modal open={isModalOpen} title="New Supplier" onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <Input id="name" label="Name" icon={null} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input id="contactName" label="Contact Name" icon={null} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <Input id="contactEmail" label="Contact Email" icon={null} type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          <Input id="contactPhone" label="Contact Phone" icon={null} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          <Input id="address" label="Address" icon={null} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SupplierListPage;
