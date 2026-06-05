/**
 * QUEST PERSISTENCE ADAPTER FACTORY
 *
 * Creates the appropriate persistence adapter based on environment.
 * Supports JSON (default MVP) and Postgres (production).
 *
 * Rules:
 * - JSON is fallback when DB unavailable
 * - No secrets logged
 * - Graceful degradation on DB failure
 */

import { JsonQuestPersistenceAdapter } from "./JsonQuestPersistenceAdapter.js";
import { PgQuestPersistenceAdapter, ensurePlayerQuestStateTable } from "./PgQuestPersistenceAdapter.js";
import type { QuestPersistenceAdapter } from "./QuestPersistence.js";

export type QuestPersistenceDriver = "json" | "postgres";

export async function createQuestPersistenceAdapter(): Promise<QuestPersistenceAdapter> {
  const driver = (process.env.QUEST_PERSISTENCE_DRIVER ?? "json") as QuestPersistenceDriver;

  if (driver === "postgres") {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.warn("[quest-persist] QUEST_PERSISTENCE_DRIVER=postgres but DATABASE_URL not set, falling back to JSON");
      return new JsonQuestPersistenceAdapter();
    }

    try {
      // Ensure table exists
      await ensurePlayerQuestStateTable(dbUrl);
      return new PgQuestPersistenceAdapter(dbUrl);
    } catch (error) {
      console.error("[quest-persist] Failed to initialize Postgres adapter:", error);
      console.warn("[quest-persist] Falling back to JSON adapter");
      return new JsonQuestPersistenceAdapter();
    }
  }

  // Default: JSON adapter
  return new JsonQuestPersistenceAdapter();
}

/**
 * Get the current driver name for health checks.
 */
export function getQuestPersistenceDriverName(): QuestPersistenceDriver {
  return (process.env.QUEST_PERSISTENCE_DRIVER ?? "json") as QuestPersistenceDriver;
}