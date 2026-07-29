import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../store/slices/inventorySlice';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import type { Category } from '../types/inventory';

const CategoryManagementPage = () => {
  const dispatch = useAppDispatch();
  const { categories, categoriesStatus, categoriesError } = useAppSelector((state) => state.inventory);

  const [editing, setEditing] = useState<Category | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setDescription(category.description ?? '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    const result = editing
      ? await dispatch(updateCategory({ id: editing._id, payload: { name, description } }))
      : await dispatch(createCategory({ name, description }));
    setIsSubmitting(false);

    if (result.meta.requestStatus === 'fulfilled') {
      setIsModalOpen(false);
    } else {
      setFormError((result.payload as string) || 'Unable to save category');
    }
  };

  const handleDelete = async (category: Category) => {
    setDeleteError('');
    const result = await dispatch(deleteCategory(category._id));
    if (deleteCategory.rejected.match(result)) {
      setDeleteError((result.payload as string) || 'Unable to delete category');
    }
  };

  const columns: TableColumn<Category>[] = [
    { key: 'name', header: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'description', header: 'Description', render: (row) => row.description || '-' },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => openEdit(row)}
            aria-label={`Edit ${row.name}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            aria-label={`Delete ${row.name}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Categories</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Organize items into categories.</p>
        </div>
        <Button onClick={openCreate} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      </div>

      {deleteError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{deleteError}</span>
        </div>
      )}

      <Table
        columns={columns}
        rows={categories}
        rowKey={(r) => r._id}
        isLoading={categoriesStatus === 'loading'}
        error={categoriesError}
        emptyMessage="No categories yet"
      />

      <Modal open={isModalOpen} title={editing ? 'Edit Category' : 'New Category'} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <Input id="name" label="Name" icon={null} value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            id="description"
            label="Description (optional)"
            icon={null}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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

export default CategoryManagementPage;
