import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
import { useTheme } from './hooks/useTheme';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';

const HomeGuard = ({ children }: { children: ReactNode }) => {
  const token = useAppSelector((state) => state.auth.token);
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

function App() {
  useTheme();

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
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
    </Routes>
  );
}

export default App;
