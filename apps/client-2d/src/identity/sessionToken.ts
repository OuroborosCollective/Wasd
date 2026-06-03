/**
 * Phase 7: Session Token Management
 * 
 * Client-side session token persistence.
 * Token is authoritative only when server validates it.
 */

const STORAGE_KEY = "areloria.sessionToken.v1";

export interface ClientSessionToken {
  token: string | null;
}

export function getClientSessionToken(): ClientSessionToken {
  try {
    return {
      token: localStorage.getItem(STORAGE_KEY)
    };
  } catch {
    return {
      token: null
    };
  }
}

export function setClientSessionToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // ignore storage failures
  }
}

export function clearClientSessionToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}