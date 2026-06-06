/**
 * EQUIPMENT SERVICE
 *
 * Server-authoritative equipment service with inventory ownership validation.
 * Deterministic: No Date.now(), no Math.random().
 */

import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { EquipmentStore } from "./EquipmentStore.js";
import {
  createPersistedPlayerEquipmentState,
  type EquipmentPersistenceAdapter,
} from "./EquipmentPersistence.js";
import type { EquipItemResult, PlayerEquipmentState } from "./EquipmentTypes.js";

export class EquipmentService {
  private readonly hydratedPlayers = new Set<string>();

  constructor(
    private readonly store: EquipmentStore,
    private readonly persistence: EquipmentPersistenceAdapter,
  ) {}

  async getPlayerEquipment(playerId: string): Promise<PlayerEquipmentState> {
    await this.hydratePlayer(playerId);
    return this.store.getPlayerEquipment(playerId);
  }

  async equipItem(input: {
    playerId: string;
    itemId: string;
  }): Promise<EquipItemResult> {
    await this.hydratePlayer(input.playerId);

    const inventoryService = await getInventoryService();
    const inventory = await inventoryService.getPlayerInventory(input.playerId);
    const ownsItem = inventory.slots.some(
      (slot) => slot.itemId === input.itemId && slot.quantity > 0,
    );

    const result = this.store.equipItem({
      playerId: input.playerId,
      itemId: input.itemId,
      ownsItem,
    });

    if (result.ok && result.equipment) {
      await this.persistence.savePlayerEquipment(
        createPersistedPlayerEquipmentState(input.playerId, result.equipment),
      );
    }

    return result;
  }

  async hydratePlayer(playerId: string): Promise<void> {
    if (this.hydratedPlayers.has(playerId)) return;

    const persisted = await this.persistence.loadPlayerEquipment(playerId);
    if (persisted) {
      this.store.replacePlayerEquipment(playerId, persisted);
    }

    this.hydratedPlayers.add(playerId);
  }

  clearForTests(): void {
    this.hydratedPlayers.clear();
  }
}