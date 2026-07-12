import { JsonEquipmentPersistenceAdapter } from "./JsonEquipmentPersistenceAdapter.js";
import type { EquipmentPersistenceAdapter } from "./EquipmentPersistence.js";
import {
  requirePostgresDatabaseUrl,
  resolveScopedPersistenceDriver,
} from "../modules/persistence/persistencePolicy.js";

export async function createEquipmentPersistenceAdapter(): Promise<EquipmentPersistenceAdapter> {
  const driver = resolveScopedPersistenceDriver([
    "EQUIPMENT_PERSISTENCE_DRIVER",
    "INVENTORY_PERSISTENCE_DRIVER",
    "QUEST_PERSISTENCE_DRIVER",
  ]);

  if (driver === "postgres") {
    const { PgEquipmentPersistenceAdapter } = await import("./PgEquipmentPersistenceAdapter.js");
    return new PgEquipmentPersistenceAdapter(requirePostgresDatabaseUrl("equipment-persist"));
  }

  return new JsonEquipmentPersistenceAdapter();
}
