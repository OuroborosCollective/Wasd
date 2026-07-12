import { JsonSkillPersistenceAdapter } from "./JsonSkillPersistenceAdapter.js";
import { PgSkillPersistenceAdapter, ensurePlayerSkillStateTable } from "./PgSkillPersistenceAdapter.js";
import type { SkillPersistenceAdapter } from "./SkillPersistence.js";
import {
  handlePostgresInitializationFailure,
  requirePostgresDatabaseUrl,
  resolveScopedPersistenceDriver,
} from "../modules/persistence/persistencePolicy.js";

export type SkillPersistenceDriver = "json" | "postgres";

export async function createSkillPersistenceAdapter(): Promise<SkillPersistenceAdapter> {
  const driver = resolveScopedPersistenceDriver([
    "SKILL_PERSISTENCE_DRIVER",
    "QUEST_PERSISTENCE_DRIVER",
  ]);

  if (driver === "postgres") {
    const dbUrl = requirePostgresDatabaseUrl("skill-persist");
    try {
      await ensurePlayerSkillStateTable(dbUrl);
      return new PgSkillPersistenceAdapter(dbUrl);
    } catch (error) {
      handlePostgresInitializationFailure("skill-persist", error);
      return new JsonSkillPersistenceAdapter();
    }
  }

  return new JsonSkillPersistenceAdapter();
}

export function getSkillPersistenceDriverName(): SkillPersistenceDriver {
  return resolveScopedPersistenceDriver([
    "SKILL_PERSISTENCE_DRIVER",
    "QUEST_PERSISTENCE_DRIVER",
  ]);
}
