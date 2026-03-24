/**
 * WorldBrainCacheService.ts
 *
 * Persistiert den Zustand des HeuristicWorldBrain in Azure Redis Enterprise.
 *
 * Datenstruktur in Redis:
 *   world:brain:state       → Aktueller World-Brain-Zustand (JSON, TTL: 10s)
 *   world:brain:history     → Redis-List mit den letzten 100 Zuständen (für Trend-Analyse)
 *   world:brain:anomalies   → Aktuelle Anomalien (JSON-Array, TTL: 30s)
 *
 * Schreib-Throttling: Der Zustand wird maximal alle WRITE_INTERVAL_MS Millisekunden
 * in Redis geschrieben, um den Game-Loop bei 10Hz nicht zu überlasten.
 */

import { getRedisClient, isRedisAvailable } from "../../core/RedisClient.js";

export interface WorldBrainSnapshot {
  timestamp: number;
  tickCount: number;
  nodes: number;
  centerValue: number;
  summary: string;
  activeAnomalies: string[];
}

// Schreib-Throttle: Mindestabstand zwischen Redis-Writes (in ms)
// Bei 10Hz (100ms/Tick) schreiben wir maximal alle 5 Sekunden (50 Ticks)
const WRITE_INTERVAL_MS = 5000;

// Maximale Anzahl gespeicherter Snapshots in der History-Liste
const MAX_HISTORY_ENTRIES = 100;

// TTL für den aktuellen Zustand (in Sekunden)
const CURRENT_STATE_TTL = 10;

// TTL für Anomalien (in Sekunden)
const ANOMALIES_TTL = 30;

// TTL für die History-Liste (in Sekunden) – 1 Stunde
const HISTORY_TTL = 3600;

export class WorldBrainCacheService {
  private static instance: WorldBrainCacheService;
  private lastWriteTime = 0;

  static getInstance(): WorldBrainCacheService {
    if (!WorldBrainCacheService.instance) {
      WorldBrainCacheService.instance = new WorldBrainCacheService();
    }
    return WorldBrainCacheService.instance;
  }

  /**
   * Speichert den aktuellen World-Brain-Zustand in Redis.
   * Throttled: Schreibt maximal alle WRITE_INTERVAL_MS Millisekunden.
   * Fire-and-forget: Blockiert den Game-Loop nicht.
   */
  persistState(
    tickCount: number,
    analysis: { nodes: number; centerValue: number; summary: string; activeAnomalies: string[] }
  ): void {
    const redis = getRedisClient();
    if (!redis || !isRedisAvailable()) return;

    const now = Date.now();
    if (now - this.lastWriteTime < WRITE_INTERVAL_MS) return; // Throttle
    this.lastWriteTime = now;

    const snapshot: WorldBrainSnapshot = {
      timestamp: now,
      tickCount,
      nodes: analysis.nodes,
      centerValue: analysis.centerValue,
      summary: analysis.summary,
      activeAnomalies: analysis.activeAnomalies
    };
    const serialized = JSON.stringify(snapshot);

    // Asynchron, blockiert den Game-Loop nicht
    (async () => {
      try {
        // Aktuellen Zustand speichern
        await redis.setex("world:brain:state", CURRENT_STATE_TTL, serialized);

        // Anomalien separat speichern (für schnellen Zugriff durch externe Systeme)
        if (analysis.activeAnomalies.length > 0) {
          await redis.setex(
            "world:brain:anomalies",
            ANOMALIES_TTL,
            JSON.stringify(analysis.activeAnomalies)
          );
        }

        // History-Liste befüllen (für Trend-Analyse)
        await redis.rpush("world:brain:history", serialized);
        await redis.ltrim("world:brain:history", -MAX_HISTORY_ENTRIES, -1);
        await redis.expire("world:brain:history", HISTORY_TTL);
      } catch (err: any) {
        if (process.env.NODE_ENV !== "production") {
          console.debug(`[WorldBrainCache] Fehler beim Persistieren: ${err.message}`);
        }
      }
    })();
  }

  /**
   * Liest den aktuellen World-Brain-Zustand aus Redis.
   */
  async getCurrentState(): Promise<WorldBrainSnapshot | null> {
    const redis = getRedisClient();
    if (!redis || !isRedisAvailable()) return null;

    try {
      const raw = await redis.get("world:brain:state");
      return raw ? (JSON.parse(raw) as WorldBrainSnapshot) : null;
    } catch (err: any) {
      console.warn(`[WorldBrainCache] Fehler beim Lesen des aktuellen Zustands: ${err.message}`);
      return null;
    }
  }

  /**
   * Liest die letzten N World-Brain-Snapshots aus Redis (für Trend-Analyse).
   */
  async getHistory(limit = 20): Promise<WorldBrainSnapshot[]> {
    const redis = getRedisClient();
    if (!redis || !isRedisAvailable()) return [];

    try {
      const entries = await redis.lrange("world:brain:history", -limit, -1);
      return entries.map((e: string) => JSON.parse(e) as WorldBrainSnapshot);
    } catch (err: any) {
      console.warn(`[WorldBrainCache] Fehler beim Lesen der History: ${err.message}`);
      return [];
    }
  }

  /**
   * Liest die aktuellen Anomalien aus Redis.
   */
  async getAnomalies(): Promise<string[]> {
    const redis = getRedisClient();
    if (!redis || !isRedisAvailable()) return [];

    try {
      const raw = await redis.get("world:brain:anomalies");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch (err: any) {
      console.warn(`[WorldBrainCache] Fehler beim Lesen der Anomalien: ${err.message}`);
      return [];
    }
  }
}

// Singleton-Export
export const worldBrainCache = WorldBrainCacheService.getInstance();
