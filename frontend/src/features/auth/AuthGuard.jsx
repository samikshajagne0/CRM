import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

// ── AuthGuard — protect any route that requires login ─────────
export function AuthGuard({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Preserve the intended destination so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// ── AdminGuard — protect routes that require admin role ────────
export function AdminGuard({ children }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// ── ManagerGuard — protect routes requiring manager or admin ───
export function ManagerGuard({ children }) {
  const { isManager } = useAuth();

  if (!isManager) {
    return <Navigate to="/" replace />;
  }

  return children;
}
