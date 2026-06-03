/**
 * Phase 7: Client Identity Management
 * 
 * Stable guest identity for deterministic player ownership.
 * NOT a security proof - only a recognition hint.
 * Real ownership comes from server-side session tokens.
 */

const STORAGE_KEY = "areloria.stableGuestId.v1";

export interface ClientIdentity {
  stableGuestId: string;
  createdNow: boolean;
}

function createStableGuestId(): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.randomUUID) {
    return `guest_${cryptoApi.randomUUID()}`;
  }

  // Fallback deterministic-ish ID using userAgent + timestamp
  // This should rarely be used in modern browsers
  const entropy = `${navigator.userAgent}_${Math.random()}_${Date.now()}`;
  let hash = 2166136261;

  for (let i = 0; i < entropy.length; i += 1) {
    hash ^= entropy.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `guest_${Math.abs(hash).toString(36)}`;
}

export function getOrCreateClientIdentity(): ClientIdentity {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);

    if (existing && existing.startsWith("guest_")) {
      return {
        stableGuestId: existing,
        createdNow: false
      };
    }

    const stableGuestId = createStableGuestId();
    localStorage.setItem(STORAGE_KEY, stableGuestId);

    return {
      stableGuestId,
      createdNow: true
    };
  } catch {
    return {
      stableGuestId: createStableGuestId(),
      createdNow: true
    };
  }
}

export function resetClientIdentityForDebug(): ClientIdentity {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }

  return getOrCreateClientIdentity();
}

export function shortIdentity(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 10)}…${id.slice(-6)}`;
}