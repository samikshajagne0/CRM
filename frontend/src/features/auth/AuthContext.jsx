import { createContext, useContext, useState, useCallback } from 'react';

// ── DEV ONLY: OTP bypass flag ─────────────────────────────────
// Reads from Vite env (VITE_BYPASS_OTP=true in frontend/.env).
// When true, the LoginPage skips the OTP screen entirely.
// Set VITE_BYPASS_OTP=false (or remove) once Resend is live.
export const DEV_BYPASS_OTP = import.meta.env.VITE_BYPASS_OTP === 'true';

// ── Token storage helpers ──────────────────────────────────────
// Exported so apiClient.js can import them without circular deps
export function getStoredToken() {
  return localStorage.getItem('crm_token');
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('crm_user')); }
  catch { return null; }
}

export function clearAuth() {
  localStorage.removeItem('crm_token');
  localStorage.removeItem('crm_user');
}

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(getStoredUser);
  const [token, setToken] = useState(getStoredToken);

  const login = useCallback((userData, jwt) => {
    localStorage.setItem('crm_token', jwt);
    localStorage.setItem('crm_user', JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;
  const isAdmin    = user?.role === 'admin';
  const isManager  = ['admin', 'manager'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isAdmin, isManager, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
