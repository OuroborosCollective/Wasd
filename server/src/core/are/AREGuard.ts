import { KAPPA, assertSafeInteger } from './Kappa';

/**
 * AREGuard - ARE Determinism Protection Mechanism
 * 
 * This class provides runtime protection against nondeterminism in the ARE core.
 * 
 * @ARE-GUARD-EXEMPT: Protection mechanism implementation; not world-state input.
 */

export class AREGuard {
  static verifyKappaIntegrity(): void {
    if (KAPPA !== 1000) {
      throw new Error(`[ARE-Guard] FATAL: KAPPA has been compromised. Expected 1000, got ${KAPPA}.`);
    }
  }

  static assertNoFloats(payload: unknown, path = 'root', seen = new WeakSet<object>()): void {
    if (payload === null || payload === undefined) return;

    if (typeof payload === 'number') {
      assertSafeInteger(payload, `payload at '${path}'`);
      return;
    }

    if (typeof payload !== 'object') return;
    if (seen.has(payload)) return;
    seen.add(payload);

    for (const key of Reflect.ownKeys(payload)) {
      const value = (payload as Record<PropertyKey, unknown>)[key];
      AREGuard.assertNoFloats(value, `${path}.${String(key)}`, seen);
    }
  }

  static protectPayload<T>(payload: T, seen = new WeakSet<object>()): T {
    if (payload === null || typeof payload !== 'object') return payload;
    if (seen.has(payload)) return payload;
    seen.add(payload);

    for (const key of Reflect.ownKeys(payload)) {
      const value = (payload as Record<PropertyKey, unknown>)[key];
      if (value !== null && typeof value === 'object') {
        AREGuard.protectPayload(value, seen);
      }
    }

    return Object.freeze(payload);
  }

  /**
   * executeProtected - ARE Determinism Protection Mechanism
   * 
   * This method is the protection layer that PREVENTS nondeterminism.
   * The `Math.random` and `Date.now` references below are the protection
   * implementation (saving originals for later restore), NOT nondeterministic
   * usage in world-state logic.
   * 
   * @ARE-GUARD-EXEMPT: Protection mechanism implementation; not world-state input.
   */
  static executeProtected<T>(tickFn: () => T): T {
    // ARE-DETERMINISM-ALLOW Protection: Save original functions for restoration
    // @ts-ignore
    const originalRandom = Math.random;
    // @ts-ignore
    const originalDateNow = Date.now;

    try {
      // ARE-DETERMINISM-ALLOW Protection: Install throw handlers
      Math.random = () => {
        throw new Error('[ARE-Guard] Math.random is strictly prohibited in authoritative core.');
      };
      // @ts-ignore
      Date.now = () => {
        throw new Error('[ARE-Guard] Date.now is strictly prohibited. Use deterministic tick time.');
      };

      return tickFn();
    } finally {
      // ARE-DETERMINISM-ALLOW Restoration: Restore original functions
      Math.random = originalRandom;
      // @ts-ignore
      Date.now = originalDateNow;
    }
  }
}
