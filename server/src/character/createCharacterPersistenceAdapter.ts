import { JsonCharacterPersistenceAdapter } from "./JsonCharacterPersistenceAdapter.js";
import type { CharacterPersistenceAdapter } from "./CharacterPersistence.js";
import {
  requirePostgresDatabaseUrl,
  resolveScopedPersistenceDriver,
} from "../modules/persistence/persistencePolicy.js";

export async function createCharacterPersistenceAdapter(): Promise<CharacterPersistenceAdapter> {
  const driver = resolveScopedPersistenceDriver([
    "CHARACTER_PERSISTENCE_DRIVER",
    "EQUIPMENT_PERSISTENCE_DRIVER",
    "INVENTORY_PERSISTENCE_DRIVER",
    "QUEST_PERSISTENCE_DRIVER",
  ]);

  if (driver === "postgres") {
    const { PgCharacterPersistenceAdapter } = await import("./PgCharacterPersistenceAdapter.js");
    return new PgCharacterPersistenceAdapter(requirePostgresDatabaseUrl("character-persist"));
  }

  return new JsonCharacterPersistenceAdapter();
}
