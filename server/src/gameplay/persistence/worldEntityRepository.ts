/**
 * Phase 6: World Entity Repository
 * 
 * Handles world entity persistence with memory fallback.
 * World entities include NPCs, loot, markers that persist across sessions.
 */

import type { PersistedWorldEntity } from "./types.js";

export interface WorldEntityRepository {
  getSceneEntities(sceneId: string): Promise<PersistedWorldEntity[]>;
  upsertEntity(entity: PersistedWorldEntity): Promise<void>;
  deleteEntity(entityId: string): Promise<void>;
}

/**
 * Memory-backed world entity repository for development/degraded mode.
 */
export function createMemoryWorldEntityRepository(): WorldEntityRepository {
  const entities = new Map<string, PersistedWorldEntity>();

  return {
    async getSceneEntities(sceneId) {
      return Array.from(entities.values())
        .filter((entity) => entity.sceneId === sceneId)
        .map((entity) => ({ ...entity }));
    },

    async upsertEntity(entity) {
      entities.set(entity.id, { ...entity });
    },

    async deleteEntity(entityId) {
      entities.delete(entityId);
    }
  };
}