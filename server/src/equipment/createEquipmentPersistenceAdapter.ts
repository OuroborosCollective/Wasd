/**
 * EQUIPMENT PERSISTENCE FACTORY
 *
 * Creates the appropriate persistence adapter based on environment.
 */

import { JsonEquipmentPersistenceAdapter } from "./JsonEquipmentPersistenceAdapter.js";
import type { EquipmentPersistenceAdapter } from "./EquipmentPersistence.js";

export async function createEquipmentPersistenceAdapter(): Promise<EquipmentPersistenceAdapter> {
  const driver =
    process.env.EQUIPMENT_PERSISTENCE_DRIVER ??
    process.env.INVENTORY_PERSISTENCE_DRIVER ??
    process.env.QUEST_PERSISTENCE_DRIVER ??
    "json";

  if (driver === "postgres") {
    const { PgEquipmentPersistenceAdapter } = await import("./PgEquipmentPersistenceAdapter.js");
    return new PgEquipmentPersistenceAdapter(process.env.DATABASE_URL);
  }

  return new JsonEquipmentPersistenceAdapter();
}