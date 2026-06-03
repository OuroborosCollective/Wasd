/**
 * Phase 6: Inventory Repository
 * 
 * Handles inventory slot persistence with memory fallback.
 */

import type { PersistedInventorySlot } from "./types.js";

export interface InventoryRepository {
  getInventory(playerId: string): Promise<PersistedInventorySlot[]>;
  saveInventory(playerId: string, slots: PersistedInventorySlot[]): Promise<void>;
}

/**
 * Memory-backed inventory repository for development/degraded mode.
 */
export function createMemoryInventoryRepository(): InventoryRepository {
  const inventories = new Map<string, PersistedInventorySlot[]>();

  return {
    async getInventory(playerId) {
      return inventories.get(playerId)?.map((slot) => ({ ...slot })) ?? [];
    },

    async saveInventory(playerId, slots) {
      inventories.set(
        playerId,
        slots.map((slot) => ({ ...slot, playerId }))
      );
    }
  };
}