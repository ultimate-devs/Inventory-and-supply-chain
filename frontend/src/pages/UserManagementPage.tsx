import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, UserX, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { userAdminService } from '../services/userAdminService';
import { getApiErrorMessage } from '../lib/apiClient';
import { useAppSelector } from '../store/hooks';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import type { AdminUser } from '../types/admin';
import { ROLES } from '../types/auth';
import type { Role } from '../types/auth';

const ROLE_OPTIONS: Role[] = [ROLES.SUPER_ADMIN, ROLES.INVENTORY_MANAGER, ROLES.PROCUREMENT_OFFICER, ROLES.ANALYST];

const UserManagementPage = () => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(ROLES.ANALYST);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const result = await userAdminService.list();
      setUsers(result);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load users'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setName('');
    setEmail('');
    setRole(ROLES.ANALYST);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    setActionMessage('');
    try {
      const created = await userAdminService.create({ name, email, role });
      setUsers((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setActionMessage(`Login credentials were emailed to ${created.email}.`);
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Unable to create user'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    setActionError('');
    setActionMessage('');
    try {
      await userAdminService.resetPassword(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, mustChangePassword: true } : u)));
      setActionMessage(`A new temporary password was emailed to ${user.email}.`);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Unable to reset password'));
    }
  };

  const handleRoleChange = async (user: AdminUser, role: Role) => {
    setActionError('');
    try {
      const updated = await userAdminService.update(user.id, { role });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Unable to update role'));
    }
  };

  const handleDeactivate = async (user: AdminUser) => {
    setActionError('');
    try {
      await userAdminService.deactivate(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: false } : u)));
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Unable to deactivate user'));
    }
  };

  const columns: TableColumn<AdminUser>[] = [
    { key: 'name', header: 'Name', render: (row) => row.name },
    { key: 'email', header: 'Email', render: (row) => row.email },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <select
          value={row.role}
          disabled={row.id === currentUser?.id}
          onChange={(e) => handleRoleChange(row, e.target.value as Role)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm capitalize text-slate-900 outline-none focus:border-primary-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={row.isActive ? 'ok' : 'neutral'}>{row.isActive ? 'Active' : 'Deactivated'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="ml-auto flex justify-end gap-1">
          <button
            onClick={() => handleResetPassword(row)}
            disabled={!row.isActive}
            aria-label={`Reset password for ${row.name}`}
            title="Reset password"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <KeyRound className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeactivate(row)}
            disabled={!row.isActive || row.id === currentUser?.id}
            aria-label={`Deactivate ${row.name}`}
            title="Deactivate"
            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-red-950/40"
          >
            <UserX className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Users</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage roles and account status.</p>
        </div>
        <Button onClick={openCreate} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      <Table columns={columns} rows={users} rowKey={(r) => r.id} isLoading={isLoading} error={error} emptyMessage="No users found" />

      <Modal open={isModalOpen} title="Add User" onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <Input id="name" label="Name" icon={null} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            id="email"
            label="Email"
            icon={null}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A temporary password will be generated and emailed to this address. The user must change it the first
            time they sign in.
          </p>
          <div className="w-full">
            <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm capitalize text-slate-900 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
