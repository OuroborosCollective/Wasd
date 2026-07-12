import { JsonInventoryPersistenceAdapter } from "./JsonInventoryPersistenceAdapter.js";
import type { InventoryPersistenceAdapter } from "./InventoryPersistence.js";
import {
  requirePostgresDatabaseUrl,
  resolveScopedPersistenceDriver,
} from "../modules/persistence/persistencePolicy.js";

export async function createInventoryPersistenceAdapter(): Promise<InventoryPersistenceAdapter> {
  const driver = resolveScopedPersistenceDriver([
    "INVENTORY_PERSISTENCE_DRIVER",
    "QUEST_PERSISTENCE_DRIVER",
  ]);

  if (driver === "postgres") {
    const { PgInventoryPersistenceAdapter } = await import("./PgInventoryPersistenceAdapter.js");
    return new PgInventoryPersistenceAdapter(requirePostgresDatabaseUrl("inventory-persist"));
  }

  return new JsonInventoryPersistenceAdapter();
}
