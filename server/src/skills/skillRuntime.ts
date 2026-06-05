/**
 * SKILL RUNTIME
 *
 * Runtime singleton for skill progression.
 * Initialized at server startup.
 *
 * Rules:
 * - No Date.now() for gameplay state
 * - No Math.random()
 * - Server-authoritative
 */

import { SkillProgressionStore } from "./SkillProgressionStore.js";
import { SkillProgressionService } from "./SkillProgressionService.js";
import { createSkillPersistenceAdapter } from "./createSkillPersistenceAdapter.js";

// Initialize persistence adapter and service
const store = new SkillProgressionStore();
const adapterPromise = createSkillPersistenceAdapter();

/**
 * Lazy-initialized skill progression service.
 * Adapter is created async at first access.
 */
let servicePromise: Promise<SkillProgressionService> | null = null;

async function getOrCreateService(): Promise<SkillProgressionService> {
  if (!servicePromise) {
    const adapter = await adapterPromise;
    servicePromise = Promise.resolve(new SkillProgressionService(store, adapter));
  }
  return servicePromise;
}

/**
 * Get the skill progression service.
 * Returns a promise that resolves to the service.
 */
export async function getSkillProgressionService(): Promise<SkillProgressionService> {
  return getOrCreateService();
}

/**
 * Synchronous access to the underlying store.
 * Use for testing or when you need direct store access.
 */
export function getSkillProgressionStore(): SkillProgressionStore {
  return store;
}

// Re-export for convenience
export { skillProgressionStore } from "./SkillProgressionStore.js";
export type { SkillEvent } from "./SkillProgressionStore.js";
export type { PlayerSkillState, SkillId, SkillSnapshot } from "./SkillTypes.js";