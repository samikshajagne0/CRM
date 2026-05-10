// ============================================================
// MOCK DATA — DISABLED
// All mock data has been deactivated. The application now uses
// only live data from the connected Neon PostgreSQL database.
//
// The mock files (accounts.js, contacts.js, etc.) are preserved
// in this directory for reference but are no longer imported
// or used anywhere in the application.
//
// To re-enable mocks (for offline development), restore the
// mock interceptor in src/lib/apiClient.js.
// ============================================================

export const USE_MOCKS = false;

export async function resolveMockRequest() {
  return null;
}
