/**
 * Phase 6: Equipment Repository
 * 
 * Handles equipment slot persistence with memory fallback.
 */

import type { PersistedEquipmentSlot } from "./types.js";

export interface EquipmentRepository {
  getEquipment(playerId: string): Promise<PersistedEquipmentSlot[]>;
  saveEquipment(playerId: string, slots: PersistedEquipmentSlot[]): Promise<void>;
}

/**
 * Memory-backed equipment repository for development/degraded mode.
 */
export function createMemoryEquipmentRepository(): EquipmentRepository {
  const equipment = new Map<string, PersistedEquipmentSlot[]>();

  return {
    async getEquipment(playerId) {
      return equipment.get(playerId)?.map((slot) => ({ ...slot })) ?? [
        { playerId, slot: "weapon", itemId: null },
        { playerId, slot: "armor", itemId: null },
        { playerId, slot: "trinket", itemId: null }
      ];
    },

    async saveEquipment(playerId, slots) {
      equipment.set(
        playerId,
        slots.map((slot) => ({ ...slot, playerId }))
      );
    }
  };
}