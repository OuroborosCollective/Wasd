/**
 * SKILL PERSISTENCE ADAPTER FACTORY
 *
 * Creates the appropriate persistence adapter based on environment.
 * Supports JSON (default) and Postgres (production).
 *
 * Rules:
 * - JSON is fallback when DB unavailable
 * - No secrets logged
 * - Graceful degradation on DB failure
 */

import { JsonSkillPersistenceAdapter } from "./JsonSkillPersistenceAdapter.js";
import { PgSkillPersistenceAdapter, ensurePlayerSkillStateTable } from "./PgSkillPersistenceAdapter.js";
import type { SkillPersistenceAdapter } from "./SkillPersistence.js";

export type SkillPersistenceDriver = "json" | "postgres";

export async function createSkillPersistenceAdapter(): Promise<SkillPersistenceAdapter> {
  const driver = (process.env.SKILL_PERSISTENCE_DRIVER ?? process.env.QUEST_PERSISTENCE_DRIVER ?? "json") as SkillPersistenceDriver;

  if (driver === "postgres") {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.warn("[skill-persist] SKILL_PERSISTENCE_DRIVER=postgres but DATABASE_URL not set, falling back to JSON");
      return new JsonSkillPersistenceAdapter();
    }

    try {
      await ensurePlayerSkillStateTable(dbUrl);
      return new PgSkillPersistenceAdapter(dbUrl);
    } catch (error) {
      console.error("[skill-persist] Failed to initialize Postgres adapter:", error);
      console.warn("[skill-persist] Falling back to JSON adapter");
      return new JsonSkillPersistenceAdapter();
    }
  }

  return new JsonSkillPersistenceAdapter();
}

/**
 * Get the current driver name for health checks.
 */
export function getSkillPersistenceDriverName(): SkillPersistenceDriver {
  return (process.env.SKILL_PERSISTENCE_DRIVER ?? process.env.QUEST_PERSISTENCE_DRIVER ?? "json") as SkillPersistenceDriver;
}