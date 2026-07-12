import { JsonQuestPersistenceAdapter } from "./JsonQuestPersistenceAdapter.js";
import { PgQuestPersistenceAdapter, ensurePlayerQuestStateTable } from "./PgQuestPersistenceAdapter.js";
import type { QuestPersistenceAdapter } from "./QuestPersistence.js";
import {
  handlePostgresInitializationFailure,
  requirePostgresDatabaseUrl,
  resolveScopedPersistenceDriver,
} from "../modules/persistence/persistencePolicy.js";

export type QuestPersistenceDriver = "json" | "postgres";

export async function createQuestPersistenceAdapter(): Promise<QuestPersistenceAdapter> {
  const driver = resolveScopedPersistenceDriver(["QUEST_PERSISTENCE_DRIVER"]);

  if (driver === "postgres") {
    const dbUrl = requirePostgresDatabaseUrl("quest-persist");
    try {
      await ensurePlayerQuestStateTable(dbUrl);
      return new PgQuestPersistenceAdapter(dbUrl);
    } catch (error) {
      handlePostgresInitializationFailure("quest-persist", error);
      return new JsonQuestPersistenceAdapter();
    }
  }

  return new JsonQuestPersistenceAdapter();
}

export function getQuestPersistenceDriverName(): QuestPersistenceDriver {
  return resolveScopedPersistenceDriver(["QUEST_PERSISTENCE_DRIVER"]);
}
