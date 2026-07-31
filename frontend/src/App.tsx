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
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import InventoryListPage from './pages/InventoryListPage';
import ItemDetailPage from './pages/ItemDetailPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ROPEOQCalculatorPage from './pages/ROPEOQCalculatorPage';
import SupplierListPage from './pages/SupplierListPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import PurchaseOrderListPage from './pages/PurchaseOrderListPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import CreatePurchaseOrderPage from './pages/CreatePurchaseOrderPage';
import GreedyAlgorithmRunPage from './pages/GreedyAlgorithmRunPage';
import AlgorithmComparisonPage from './pages/AlgorithmComparisonPage';
import GreedyAlgorithmHistoryPage from './pages/GreedyAlgorithmHistoryPage';

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
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryListPage />} />
          <Route path="/inventory/:id" element={<ItemDetailPage />} />
          <Route path="/categories" element={<CategoryManagementPage />} />
          <Route path="/rop-eoq-calculator" element={<ROPEOQCalculatorPage />} />

          <Route path="/suppliers" element={<SupplierListPage />} />
          <Route path="/suppliers/:id" element={<SupplierDetailPage />} />

          <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
          <Route path="/purchase-orders/new" element={<CreatePurchaseOrderPage />} />
          <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />

          <Route path="/algorithms/greedy" element={<GreedyAlgorithmRunPage />} />
          <Route path="/algorithms/compare" element={<AlgorithmComparisonPage />} />
          <Route path="/algorithms/history" element={<GreedyAlgorithmHistoryPage />} />

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
