import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import type { Role } from '../../types/auth';

interface ProtectedRouteProps {
  roles?: Role[];
}

const CHANGE_PASSWORD_PATH = '/change-password';

const FullScreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-900">
    <Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-400" />
  </div>
);

const ProtectedRoute = ({ roles }: ProtectedRouteProps) => {
  const { status, user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <FullScreenLoader />;
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }

  if (!user.mustChangePassword && location.pathname === CHANGE_PASSWORD_PATH) {
    return <Navigate to="/dashboard" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
