import { getRedisClient, isRedisAvailable } from "../../core/RedisClient.js";
import { serializePlayerForPersistence } from "./playerSnapshot.js";
import type { IPersistenceBackend } from "./persistenceBackend.js";

export class RedisPersistenceBackend implements IPersistenceBackend {
  readonly name = "redis";
  private readonly PLAYER_KEY = "areloria:player_snapshots";
  private readonly WORLD_OBJECT_KEY = "areloria:world_object_snapshots";

  async init(): Promise<void> {
    if (!isRedisAvailable()) {
      console.warn("[Persistence] Redis backend selected but Redis is not available.");
    }
  }

  async testConnection(): Promise<boolean> {
    const client = getRedisClient();
    if (!client || !isRedisAvailable()) return false;
    try {
      await client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async save(data: Readonly<Record<string, unknown>>): Promise<void> {
    const client = getRedisClient();
    if (!client || !isRedisAvailable()) {
      console.warn("[Persistence] Redis save skipped (Redis not available).");
      return;
    }

    try {
      const pipeline = client.pipeline();
      const ids = Object.keys(data);
      if (ids.length === 0) return;

      for (const id of ids) {
        const payload = {
          ...serializePlayerForPersistence(data[id]),
          lastUpdated: "1970-01-01T00:00:00.000Z" /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
        };
        pipeline.hset(this.PLAYER_KEY, id, JSON.stringify(payload));
      }
      await pipeline.exec();
      console.log(`Saved ${ids.length} players to Redis.`);
    } catch (err) {
      console.error("[Persistence] Failed to save players to Redis:", err);
    }
  }

  async load(): Promise<Record<string, unknown>> {
    const client = getRedisClient();
    if (!client || !isRedisAvailable()) return {};

    try {
      const all = await client.hgetall(this.PLAYER_KEY);
      const out: Record<string, unknown> = {};
      for (const id in all) {
        try {
          out[id] = JSON.parse(all[id]);
        } catch (e) {
          console.warn(`[Persistence] Failed to parse player snapshot for ${id} from Redis`);
        }
      }
      console.log(`Loaded ${Object.keys(out).length} players from Redis.`);
      return out;
    } catch (err) {
      console.error("[Persistence] Failed to load players from Redis:", err);
      return {};
    }
  }

  async saveWorldObjects(
    objects: readonly Readonly<Record<string, unknown>>[],
  ): Promise<void> {
    const client = getRedisClient();
    if (!client || !isRedisAvailable()) {
      console.warn("[Persistence] Redis saveWorldObjects skipped (Redis not available).");
      return;
    }
    if (objects.length === 0) return;

    try {
      const pipeline = client.pipeline();
      for (const obj of objects) {
        const id = typeof obj?.id === "string" ? obj.id : "";
        if (!id) continue;
        pipeline.hset(this.WORLD_OBJECT_KEY, id, JSON.stringify(obj));
      }
      await pipeline.exec();
      console.log(`Saved ${objects.length} world objects to Redis.`);
    } catch (err) {
      console.error("[Persistence] Failed to save world objects to Redis:", err);
    }
  }

  async loadWorldObjects(): Promise<Record<string, unknown>[]> {
    const client = getRedisClient();
    if (!client || !isRedisAvailable()) return [];
    try {
      const all = await client.hgetall(this.WORLD_OBJECT_KEY);
      return Object.values(all).map((val) => {
        try {
          return JSON.parse(val as string);
        } catch {
          return null;
        }
      }).filter(Boolean) as Record<string, unknown>[];
    } catch (err) {
      console.error("[Persistence] Failed to load world objects from Redis:", err);
      return [];
    }
  }
}

// Ensure WorldTick also gets the stats if needed
export function getRedisPersistenceStats() {
  return {
    available: isRedisAvailable(),
    backend: "redis",
  };
}
