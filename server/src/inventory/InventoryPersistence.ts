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
  appliedOriginUids: string[];
}

export interface InventoryPersistenceAdapter {
  loadPlayerInventory(playerId: string): Promise<PersistedPlayerInventoryState | null>;
  savePlayerInventory(state: PersistedPlayerInventoryState): Promise<void>;
  health?(): Promise<{ ok: boolean; driver: string; error?: string }>;
}

function normalizeAppliedOriginUids(values: readonly string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

export function createPersistedPlayerInventoryState(
  playerId: string,
  state: PlayerInventoryState,
  appliedOriginUids: readonly string[] = [],
): PersistedPlayerInventoryState {
  return {
    ...normalizePlayerInventoryState(state, playerId),
    appliedOriginUids: normalizeAppliedOriginUids(appliedOriginUids),
  };
}
