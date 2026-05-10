import axios from 'axios';
import { getStoredToken, clearAuth } from '../features/auth/AuthContext';

// ── Axios Instance ─────────────────────────────────────────────
// Reads VITE_API_URL from .env; in dev the Vite proxy handles /api → port 4000
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor — attach JWT ───────────────────────────
// Mock layer has been removed. All requests go to the live backend.
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor — handle 401 globally ─────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuth();
      // Force a hard reload so React auth state resets cleanly
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
