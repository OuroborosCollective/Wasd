/**
 * RedisClient.ts
 *
 * Singleton-Client für optionales Redis-Caching (Firebase-first architecture).
 * Unterstützt beliebige Redis-Server (lokal, cloud-gehostet, etc.).
 *
 * Konfiguration via Environment-Variablen:
 *   REDIS_HOST     - Hostname des Redis-Endpunkts (z.B. localhost, redis.example.com)
 *   REDIS_PORT     - Port (Standard: 6379)
 *   REDIS_PASSWORD - Passwort (optional)
 *   REDIS_TLS      - "true" aktiviert TLS (Standard: false)
 *
 * Falls REDIS_HOST nicht gesetzt ist, wird kein Redis-Client erstellt und
 * alle Operationen fallen auf den In-Memory-Fallback zurück (Graceful Degradation).
 * Dies ist die empfohlene Konfiguration für Firebase-only Deployments.
 */

import { Redis } from "ioredis";

let redisClient: Redis | null = null;
let redisAvailable = false;

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

/**
 * Initialisiert den Redis-Client. Muss einmalig beim Server-Start aufgerufen werden.
 * Gibt true zurück, wenn die Verbindung erfolgreich hergestellt wurde.
 */
export async function initRedisClient(): Promise<boolean> {
  const host = process.env.REDIS_HOST;
  const port = parseInt(process.env.REDIS_PORT || "10000", 10);
  const password = process.env.REDIS_PASSWORD;
  const useTls = process.env.REDIS_TLS !== "false"; // Standard: TLS aktiv

  if (!host) {
    console.log("[Redis] REDIS_HOST nicht gesetzt – In-Memory-Fallback aktiv.");
    return false;
  }

  if (!password) {
    console.warn("[Redis] REDIS_PASSWORD nicht gesetzt – Verbindung ohne Auth wird versucht.");
  }

  try {
    redisClient = new Redis({
      host,
      port,
      password: password || undefined,
      tls: useTls ? { servername: host } : undefined,
      connectTimeout: 5000,
      lazyConnect: true,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.warn(`[Redis] Verbindung nach ${times} Versuchen fehlgeschlagen – In-Memory-Fallback aktiv.`);
          return null; // Keine weiteren Wiederholungsversuche
        }
        return Math.min(times * 500, 2000);
      },
      enableOfflineQueue: false, // Keine Queuing bei Verbindungsverlust
    });

    // Event-Handler
      redisClient.on("connect", () => {
        redisAvailable = true;
        console.log(`[Redis] Verbunden mit Redis-Server: ${host}:${port} (TLS: ${useTls})`);
      });

    redisClient.on("error", (err: Error) => {
      if (redisAvailable) {
        console.error("[Redis] Verbindungsfehler:", err.message);
      }
      redisAvailable = false;
    });

    redisClient.on("close", () => {
      redisAvailable = false;
      console.warn("[Redis] Verbindung getrennt – In-Memory-Fallback aktiv.");
    });

    redisClient.on("reconnecting", () => {
      console.log("[Redis] Verbindung wird wiederhergestellt...");
    });

    // Verbindung herstellen
    await redisClient.connect();
    await redisClient.ping();
    redisAvailable = true;
    return true;
  } catch (err: any) {
    console.warn(`[Redis] Initialisierung fehlgeschlagen (${err.message}) – In-Memory-Fallback aktiv.`);
    redisClient = null;
    redisAvailable = false;
    return false;
  }
}

/**
 * Schließt die Redis-Verbindung sauber.
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisAvailable = false;
    console.log("[Redis] Verbindung sauber geschlossen.");
  }
}
