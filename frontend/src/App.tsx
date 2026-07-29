import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { useTheme } from './hooks/useTheme';
import { bootstrapAuth } from './store/slices/authSlice';
import { ROLES } from './types/auth';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import InventoryListPage from './pages/InventoryListPage';
import ItemDetailPage from './pages/ItemDetailPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';

const HomeGuard = ({ children }: { children: ReactNode }) => {
  const status = useAppSelector((state) => state.auth.status);
  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

function App() {
  useTheme();
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomeGuard>
            <LandingPage />
          </HomeGuard>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryListPage />} />
          <Route path="/inventory/:id" element={<ItemDetailPage />} />
          <Route path="/categories" element={<CategoryManagementPage />} />

          <Route element={<ProtectedRoute roles={[ROLES.SUPER_ADMIN]} />}>
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/settings" element={<SystemSettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
