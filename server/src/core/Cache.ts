/**
 * Cache.ts
 *
 * Einheitliche Cache-Abstraktion für Areloria / Wasd.
 * Nutzt Azure Redis Enterprise als primären Cache-Layer (L2),
 * mit einem In-Memory-Map als Fallback (L1) wenn Redis nicht verfügbar ist.
 *
 * Alle Aufrufer (WorldTick, NPCSystem, etc.) nutzen diese Abstraktion
 * und müssen nicht wissen, ob Redis verfügbar ist oder nicht.
 */

import { getRedisClient, isRedisAvailable } from "./RedisClient.js";

// ── L1: In-Memory-Fallback ────────────────────────────────────────────────────
const memoryCache = new Map<string, { value: string; expiry: number }>();

// ── Cache-Abstraktion ─────────────────────────────────────────────────────────
export const cache = {
  /**
   * Setzt einen Wert im Cache.
   * @param key   - Cache-Schlüssel
   * @param value - Zu speichernder String-Wert
   * @param _ex   - Optionaler Marker "EX" (kompatibel mit altem Interface)
   * @param _ttl  - TTL in Sekunden (Standard: 60s)
   */
  set(key: string, value: string, _ex?: string, _ttl?: number): void {
    const ttl = _ttl || 60;

    // L2: Redis (fire-and-forget, blockiert nicht den Event-Loop)
    const redis = getRedisClient();
    if (redis && isRedisAvailable()) {
      redis.setex(key, ttl, value).catch((err: Error) => {
        // Stiller Fallback: Redis-Fehler werden nicht nach oben propagiert
        if (process.env.NODE_ENV !== "production") {
          console.debug(`[Cache] Redis SET fehlgeschlagen für '${key}': ${err.message}`);
        }
      });
    }

    // L1: In-Memory immer befüllen (als Fallback und für sofortige Lesbarkeit)
    memoryCache.set(key, { value, expiry: Date.now() + ttl * 1000 });
  },

  /**
   * Liest einen Wert aus dem Cache.
   * Versucht zuerst Redis, fällt auf In-Memory zurück.
   */
  async get(key: string): Promise<string | null> {
    // L2: Redis
    const redis = getRedisClient();
    if (redis && isRedisAvailable()) {
      try {
        const val = await redis.get(key);
        if (val !== null) {
          return val;
        }
      } catch (err: any) {
        if (process.env.NODE_ENV !== "production") {
          console.debug(`[Cache] Redis GET fehlgeschlagen für '${key}': ${err.message}`);
        }
      }
    }

    // L1: In-Memory-Fallback
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value;
  },

  /**
   * Löscht einen Wert aus dem Cache.
   */
  del(key: string): void {
    // L1: Sofort löschen
    memoryCache.delete(key);

    // L2: Redis (fire-and-forget)
    const redis = getRedisClient();
    if (redis && isRedisAvailable()) {
      redis.del(key).catch((err: Error) => {
        if (process.env.NODE_ENV !== "production") {
          console.debug(`[Cache] Redis DEL fehlgeschlagen für '${key}': ${err.message}`);
        }
      });
    }
  }
};

// Status-Log beim Laden des Moduls
const redisHost = process.env.REDIS_HOST;
if (redisHost) {
  console.log(`[Cache] Redis-Modus konfiguriert (Host: ${redisHost}). Verbindung wird beim Start hergestellt.`);
} else {
  console.log("[Cache] In-Memory-Fallback aktiv (REDIS_HOST nicht gesetzt).");
}
