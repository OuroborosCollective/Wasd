/**
 * CHARACTER PERSISTENCE ADAPTER FACTORY
 *
 * Creates the appropriate persistence adapter based on environment.
 */

import { JsonCharacterPersistenceAdapter } from "./JsonCharacterPersistenceAdapter.js";
import type { CharacterPersistenceAdapter } from "./CharacterPersistence.js";

export async function createCharacterPersistenceAdapter(): Promise<CharacterPersistenceAdapter> {
  const driver =
    process.env.CHARACTER_PERSISTENCE_DRIVER ??
    process.env.EQUIPMENT_PERSISTENCE_DRIVER ??
    process.env.INVENTORY_PERSISTENCE_DRIVER ??
    process.env.QUEST_PERSISTENCE_DRIVER ??
    "json";

  if (driver === "postgres") {
    const { PgCharacterPersistenceAdapter } = await import("./PgCharacterPersistenceAdapter.js");
    return new PgCharacterPersistenceAdapter(process.env.DATABASE_URL);
  }

  return new JsonCharacterPersistenceAdapter();
}