/**
 * INVENTORY SERVICE
 *
 * Server-authoritative inventory service with persistence hydration.
 * Deterministic: No Math.random(), no Date.now(), stable ordering.
 */

import { InventoryStore } from "./InventoryStore.js";
import {
  createPersistedPlayerInventoryState,
  type InventoryPersistenceAdapter,
} from "./InventoryPersistence.js";
import type {
  InventoryAddResult,
  InventoryRemoveResult,
  InventoryItemId,
  PlayerInventoryState,
} from "./InventoryTypes.js";

export class InventoryService {
  private readonly hydratedPlayers = new Set<string>();

  constructor(
    private readonly store: InventoryStore,
    private readonly persistence: InventoryPersistenceAdapter,
  ) {}

  async getPlayerInventory(playerId: string): Promise<PlayerInventoryState> {
    await this.hydratePlayer(playerId);
    return this.store.getPlayerInventory(playerId);
  }

  async addItem(input: {
    playerId: string;
    itemId: InventoryItemId | string;
    quantity: number;
  }): Promise<InventoryAddResult> {
    await this.hydratePlayer(input.playerId);

    const result = this.store.addItem(input);

    if (result.ok && result.state) {
      await this.persistence.savePlayerInventory(
        createPersistedPlayerInventoryState(input.playerId, result.state),
      );
    }

    return result;
  }

  async removeItem(input: {
    playerId: string;
    itemId: InventoryItemId | string;
    quantity: number;
  }): Promise<InventoryRemoveResult> {
    await this.hydratePlayer(input.playerId);

    const result = this.store.removeItem(input);

    if (result.ok && result.state) {
      await this.persistence.savePlayerInventory(
        createPersistedPlayerInventoryState(input.playerId, result.state),
      );
    }

    return result;
  }

  async hasItems(input: {
    playerId: string;
    items: Array<{ itemId: InventoryItemId; quantity: number }>;
  }): Promise<boolean> {
    await this.hydratePlayer(input.playerId);
    return this.store.hasItems(input);
  }

  /**
   * Persist inventory state. Used by atomic transactions that need to persist
   * the inventory state after multiple operations.
   */
  async persistInventory(playerId: string, state: PlayerInventoryState): Promise<void> {
    await this.persistence.savePlayerInventory(
      createPersistedPlayerInventoryState(playerId, state),
    );
  }

  async hydratePlayer(playerId: string): Promise<void> {
    if (this.hydratedPlayers.has(playerId)) return;

    const persisted = await this.persistence.loadPlayerInventory(playerId);
    if (persisted) {
      this.store.replacePlayerInventory(playerId, persisted);
    }

    this.hydratedPlayers.add(playerId);
  }

  clearForTests(): void {
    this.hydratedPlayers.clear();
  }
}