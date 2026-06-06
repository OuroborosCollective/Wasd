/**
 * EQUIPMENT RUNTIME
 *
 * Singleton equipment service instance for production use.
 * Deterministic: No Date.now(), no Math.random().
 */

import { EquipmentStore } from "./EquipmentStore.js";
import { EquipmentService } from "./EquipmentService.js";
import { createEquipmentPersistenceAdapter } from "./createEquipmentPersistenceAdapter.js";

const adapter = await createEquipmentPersistenceAdapter();

export const equipmentService = new EquipmentService(
  new EquipmentStore(),
  adapter,
);