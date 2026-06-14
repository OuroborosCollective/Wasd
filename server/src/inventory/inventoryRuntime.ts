/**
 * INVENTORY RUNTIME
 *
 * Runtime singleton for server-authoritative inventory.
 * Initialized at server startup.
 *
 * Rules:
 * - No Date.now() for gameplay state
 * - No Math.random()
 * - Server-authoritative
 */

import { InventoryStore } from "./InventoryStore.js";
import { InventoryService } from "./InventoryService.js";
import { createInventoryPersistenceAdapter } from "./createInventoryPersistenceAdapter.js";
import { createPersistedPlayerInventoryState } from "./InventoryPersistence.js";

// Initialize persistence adapter and service
const store = new InventoryStore();
const adapterPromise = createInventoryPersistenceAdapter();

/**
 * Lazy-initialized inventory service.
 * Adapter is created async at first access.
 */
let servicePromise: Promise<InventoryService> | null = null;

async function getOrCreateService(): Promise<InventoryService> {
  if (!servicePromise) {
    const adapter = await adapterPromise;
    servicePromise = Promise.resolve(new InventoryService(store, adapter));
  }
  return servicePromise;
}

/**
 * Get the inventory service.
 * Returns a promise that resolves to the service.
 */
export async function getInventoryService(): Promise<InventoryService> {
  return getOrCreateService();
}

/**
 * Synchronous access to the underlying store.
 * Use for testing or when you need direct store access.
 */
export function getInventoryStore(): InventoryStore {
  return store;
}

// Re-export for convenience
export { InventoryStore } from "./InventoryStore.js";
export { createPersistedPlayerInventoryState } from "./InventoryPersistence.js";
export type { InventoryItemId, PlayerInventoryState, InventoryAddResult, InventoryRemoveResult } from "./InventoryTypes.js";