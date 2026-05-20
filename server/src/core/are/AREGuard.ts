import { KAPPA, assertSafeInteger } from './Kappa';

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

  static executeProtected<T>(tickFn: () => T): T {
    const originalRandom = Math.random;
    const originalDateNow = Date.now;

    try {
      Math.random = () => {
        throw new Error('[ARE-Guard] Math.random is strictly prohibited in authoritative core.');
      };
      Date.now = () => {
        throw new Error('[ARE-Guard] Date.now is strictly prohibited. Use deterministic tick time.');
      };

      return tickFn();
    } finally {
      Math.random = originalRandom;
      Date.now = originalDateNow;
    }
  }
}
