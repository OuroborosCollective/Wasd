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