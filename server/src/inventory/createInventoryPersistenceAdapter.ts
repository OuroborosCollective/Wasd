/**
 * INVENTORY PERSISTENCE ADAPTER FACTORY
 *
 * Creates the appropriate persistence adapter based on environment.
 */

import { JsonInventoryPersistenceAdapter } from "./JsonInventoryPersistenceAdapter.js";
import type { InventoryPersistenceAdapter } from "./InventoryPersistence.js";

export async function createInventoryPersistenceAdapter(): Promise<InventoryPersistenceAdapter> {
  const driver =
    process.env.INVENTORY_PERSISTENCE_DRIVER ??
    process.env.QUEST_PERSISTENCE_DRIVER ??
    "json";

  if (driver === "postgres") {
    const { PgInventoryPersistenceAdapter } = await import("./PgInventoryPersistenceAdapter.js");
    return new PgInventoryPersistenceAdapter(process.env.DATABASE_URL);
  }

  return new JsonInventoryPersistenceAdapter();
}