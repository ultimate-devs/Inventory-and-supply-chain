import { useEffect, useState } from 'react';
import { UserX, AlertCircle } from 'lucide-react';
import { userAdminService } from '../services/userAdminService';
import { getApiErrorMessage } from '../lib/apiClient';
import { useAppSelector } from '../store/hooks';
import Table from '../components/ui/Table';
import type { TableColumn } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
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
        <button
          onClick={() => handleDeactivate(row)}
          disabled={!row.isActive || row.id === currentUser?.id}
          aria-label={`Deactivate ${row.name}`}
          className="ml-auto flex items-center gap-1 rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-red-950/40"
        >
          <UserX className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Users</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage roles and account status.</p>
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <Table columns={columns} rows={users} rowKey={(r) => r.id} isLoading={isLoading} error={error} emptyMessage="No users found" />
    </div>
  );
};

export default UserManagementPage;
