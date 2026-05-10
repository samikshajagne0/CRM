import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard, AdminGuard } from './features/auth/AuthGuard';
import LoginPage   from './features/auth/LoginPage';
import MainLayout  from './layouts/MainLayout';

// ── Module pages ──────────────────────────────────────────────
import Dashboard     from './pages/Dashboard';
import Accounts      from './pages/Accounts';
import Contacts      from './pages/Contacts';
import Opportunities from './pages/Opportunities';
import Activities    from './pages/Activities';
import Tasks         from './pages/Tasks';
import Projects      from './pages/Projects';
import Invoices      from './pages/Invoices';
import PaymentSchedule from './pages/PaymentSchedule';
import Collections   from './pages/Collections';
import QuarterlyTracking from './pages/QuarterlyTracking';

// ── Admin ─────────────────────────────────────────────────────
import AdminPanel from './features/admin/AdminPanel';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — all routes inside MainLayout */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        }
      >
        <Route index                element={<Dashboard />} />
        <Route path="opportunities" element={<Opportunities />} />
        <Route path="accounts"      element={<Accounts />} />
        <Route path="contacts"      element={<Contacts />} />
        <Route path="projects"      element={<Projects />} />
        <Route path="invoices"      element={<Invoices />} />
        <Route path="payments"      element={<PaymentSchedule />} />
        <Route path="collections"   element={<Collections />} />
        <Route path="activities"    element={<Activities />} />
        <Route path="tasks"         element={<Tasks />} />
        <Route path="quarterly"     element={<QuarterlyTracking />} />

        {/* Admin — guarded separately */}
        <Route
          path="admin"
          element={
            <AdminGuard>
              <AdminPanel />
            </AdminGuard>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
