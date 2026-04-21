/**
 * Firebase Auth UI — DEACTIVATED
 * Auth is now handled by Supabase.
 */
export function renderAuthUI(_onLogin: (token?: string) => void) {
  return () => {};
}
export function renderLogoutBtn() {
  // No-op: Supabase handles auth now
}
