import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Boxes,
  LayoutDashboard,
  Package,
  Tags,
  Users,
  Settings,
  Bell,
  Search,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { ROLES } from '../../types/auth';
import type { Role } from '../../types/auth';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[] | null;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: null },
  { to: '/categories', label: 'Categories', icon: Tags, roles: null },
  { to: '/users', label: 'Users', icon: Users, roles: [ROLES.SUPER_ADMIN] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: [ROLES.SUPER_ADMIN] },
];

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-gradient-to-r from-primary-600 to-fuchsia-600 text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

const AppLayout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-2 px-5 text-lg font-bold text-slate-900 dark:text-slate-100">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-fuchsia-600 text-white">
          <Boxes className="h-4 w-4" />
        </span>
        SupplyChain Pro
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {visibleNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={navLinkClasses} onClick={() => setMobileNavOpen(false)}>
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        {sidebarContent}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
          <button
            type="button"
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 lg:hidden"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="relative hidden flex-1 max-w-md sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search items, categories..."
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-500 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Notifications"
              disabled
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 dark:border-slate-700"
            >
              <Bell className="h-4 w-4" />
            </button>
            <ThemeToggle />
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-700 sm:flex">
              <div className="text-right leading-tight">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name}</p>
                <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                  {user?.role.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
