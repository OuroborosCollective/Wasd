/**
 * NPCThinkingLogService.ts
 *
 * Persistiert die Gedanken (Thinkinglogs) der NPC-Agenten in Azure Redis Enterprise.
 *
 * Datenstruktur in Redis:
 *   npc:thinkinglog:<npcId>   → Redis-List mit den letzten N Gedanken (JSON-Einträge)
 *   npc:current_thought:<npcId> → String-Key mit dem aktuellen Gedanken (TTL: 30s)
 *
 * Alle Operationen sind "fire-and-forget" und blockieren den Game-Loop nicht.
 * Bei nicht verfügbarem Redis werden die Logs still verworfen.
 */

import { getRedisClient, isRedisAvailable } from "../../core/RedisClient.js";

export interface ThinkingLogEntry {
  timestamp: number;
  npcId: string;
  npcName: string;
  action: string;
  thought: string;
}

// Maximale Anzahl gespeicherter Gedanken pro NPC in Redis
const MAX_LOG_ENTRIES = 50;

// TTL für den aktuellen Gedanken (in Sekunden)
const CURRENT_THOUGHT_TTL = 30;

// TTL für die Thinking-Log-Liste (in Sekunden) – 24 Stunden
const LOG_LIST_TTL = 86400;

export class NPCThinkingLogService {
  private static instance: NPCThinkingLogService;

  static getInstance(): NPCThinkingLogService {
    if (!NPCThinkingLogService.instance) {
      NPCThinkingLogService.instance = new NPCThinkingLogService();
    }
    return NPCThinkingLogService.instance;
  }

  /**
   * Speichert einen neuen Gedanken eines NPCs in Redis.
   * Wird aufgerufen, wenn ein NPC eine neue Entscheidung trifft.
   * Fire-and-forget: Fehler werden nicht nach oben propagiert.
   */
  logThought(npcId: string, npcName: string, action: string, thought: string): void {
    const redis = getRedisClient();
    if (!redis || !isRedisAvailable()) return;

    const entry: ThinkingLogEntry = {
      timestamp: Date.now(),
      npcId,
      npcName,
      action,
      thought
    };
    const serialized = JSON.stringify(entry);

    // Asynchron, blockiert den Game-Loop nicht
    (async () => {
      try {
        const listKey = `npc:thinkinglog:${npcId}`;
        const currentKey = `npc:current_thought:${npcId}`;

        // An die Liste anhängen und auf MAX_LOG_ENTRIES begrenzen
        await redis.rpush(listKey, serialized);
        await redis.ltrim(listKey, -MAX_LOG_ENTRIES, -1);
        await redis.expire(listKey, LOG_LIST_TTL);

        // Aktuellen Gedanken als separaten Key speichern (für schnellen Zugriff)
        await redis.setex(currentKey, CURRENT_THOUGHT_TTL, serialized);
      } catch (err: any) {
        // Stiller Fehler – Game-Loop darf nicht unterbrochen werden
        if (process.env.NODE_ENV !== "production") {
          console.debug(`[NPCThinkingLog] Fehler beim Speichern für NPC '${npcId}': ${err.message}`);
        }
      }
    })();
  }

  /**
   * Liest die letzten N Gedanken eines NPCs aus Redis.
   * Gibt ein leeres Array zurück, wenn Redis nicht verfügbar ist.
   */
  async getThinkingLog(npcId: string, limit = 20): Promise<ThinkingLogEntry[]> {
    const redis = getRedisClient();
    if (!redis || !isRedisAvailable()) return [];

    try {
      const listKey = `npc:thinkinglog:${npcId}`;
      const entries = await redis.lrange(listKey, -limit, -1);
      return entries.map((e: string) => JSON.parse(e) as ThinkingLogEntry);
    } catch (err: any) {
      console.warn(`[NPCThinkingLog] Fehler beim Lesen für NPC '${npcId}': ${err.message}`);
      return [];
    }
  }

  /**
   * Liest den aktuellen Gedanken eines NPCs aus Redis.
   */
  async getCurrentThought(npcId: string): Promise<ThinkingLogEntry | null> {
    const redis = getRedisClient();
    if (!redis || !isRedisAvailable()) return null;

    try {
      const currentKey = `npc:current_thought:${npcId}`;
      const raw = await redis.get(currentKey);
      return raw ? (JSON.parse(raw) as ThinkingLogEntry) : null;
    } catch (err: any) {
      console.warn(`[NPCThinkingLog] Fehler beim Lesen des aktuellen Gedankens für NPC '${npcId}': ${err.message}`);
      return null;
    }
  }

  /**
   * Löscht alle Thinkinglogs eines NPCs (z.B. bei NPC-Despawn).
   */
  clearLogs(npcId: string): void {
    const redis = getRedisClient();
    if (!redis || !isRedisAvailable()) return;

    (async () => {
      try {
        await redis.del(`npc:thinkinglog:${npcId}`, `npc:current_thought:${npcId}`);
      } catch (err: any) {
        if (process.env.NODE_ENV !== "production") {
          console.debug(`[NPCThinkingLog] Fehler beim Löschen für NPC '${npcId}': ${err.message}`);
        }
      }
    })();
  }
}

// Singleton-Export
export const npcThinkingLog = NPCThinkingLogService.getInstance();
