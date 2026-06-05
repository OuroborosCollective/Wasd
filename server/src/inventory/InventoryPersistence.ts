/**
 * INVENTORY PERSISTENCE INTERFACE
 *
 * Defines the contract for inventory persistence adapters.
 * Supports JSON file-based and Postgres backends.
 */

import {
  normalizePlayerInventoryState,
  type PlayerInventoryState,
} from "./InventoryTypes.js";

export interface PersistedPlayerInventoryState extends PlayerInventoryState {
  schemaVersion: 1;
}

export interface InventoryPersistenceAdapter {
  loadPlayerInventory(playerId: string): Promise<PersistedPlayerInventoryState | null>;
  savePlayerInventory(state: PersistedPlayerInventoryState): Promise<void>;
  health?(): Promise<{ ok: boolean; driver: string; error?: string }>;
}

export function createPersistedPlayerInventoryState(
  playerId: string,
  state: PlayerInventoryState,
): PersistedPlayerInventoryState {
  return normalizePlayerInventoryState(state, playerId);
}