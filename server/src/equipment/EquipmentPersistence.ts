/**
 * EQUIPMENT PERSISTENCE
 *
 * Persistence adapter interface and utilities for equipment state.
 * Deterministic: No Date.now(), no Math.random().
 */

import {
  normalizeEquipmentState,
  type PlayerEquipmentState,
} from "./EquipmentTypes.js";

export interface PersistedPlayerEquipmentState extends PlayerEquipmentState {
  schemaVersion: 1;
}

export interface EquipmentPersistenceAdapter {
  loadPlayerEquipment(playerId: string): Promise<PersistedPlayerEquipmentState | null>;
  savePlayerEquipment(state: PersistedPlayerEquipmentState): Promise<void>;
  health?(): Promise<{ ok: boolean; driver: string; error?: string }>;
}

export function createPersistedPlayerEquipmentState(
  playerId: string,
  state: PlayerEquipmentState,
): PersistedPlayerEquipmentState {
  return normalizeEquipmentState(state, playerId);
}