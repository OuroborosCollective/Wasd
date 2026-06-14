/**
 * EQUIPMENT SERVICE
 *
 * Server-authoritative equipment service with atomic inventory/equipment transactions.
 * Deterministic: No Date.now(), no Math.random().
 *
 * Atomicity guarantees:
 * - equipItem: consumes inventory item, equips to slot. If slot occupied, returns old item to inventory.
 * - unequipItem: removes from equipment slot, returns item to inventory.
 * - Both operations persist inventory AND equipment states together.
 */

import { getInventoryService as defaultGetInventoryService, createPersistedPlayerInventoryState } from "../inventory/inventoryRuntime.js";
import { EquipmentStore } from "./EquipmentStore.js";
import {
  createPersistedPlayerEquipmentState,
  type EquipmentPersistenceAdapter,
} from "./EquipmentPersistence.js";
import {
  EQUIPMENT_DEFINITIONS,
  isEquipmentItemId,
  type PlayerEquipmentState,
  type EquipmentSlotId,
  type InventoryItemId,
} from "./EquipmentTypes.js";
import type { InventoryService } from "../inventory/InventoryService.js";

export { createPersistedPlayerInventoryState as createPersistedInventoryState };

export interface InventoryServiceLike {
  getPlayerInventory(playerId: string): Promise<ReturnType<InventoryService['getPlayerInventory']>>;
  addItem(input: { playerId: string; itemId: InventoryItemId | string; quantity: number }): Promise<ReturnType<InventoryService['addItem']>>;
  removeItem(input: { playerId: string; itemId: InventoryItemId | string; quantity: number }): Promise<ReturnType<InventoryService['removeItem']>>;
  persistInventory(playerId: string, state: ReturnType<InventoryService['getPlayerInventory']>): Promise<void>;
}

export interface AtomicEquipResult {
  ok: boolean;
  playerId: string;
  itemId: string;
  reason?: "equipped" | "invalid_item" | "item_not_owned" | "invalid_player";
  unequippedItemId?: string;
  equipment?: PlayerEquipmentState;
  inventoryDelta?: { itemId: InventoryItemId; delta: number };
}

export interface AtomicUnequipResult {
  ok: boolean;
  playerId: string;
  slotId: EquipmentSlotId;
  reason?: "unequipped" | "slot_empty" | "invalid_player";
  unequippedItemId?: string;
  equipment?: PlayerEquipmentState;
  inventoryDelta?: { itemId: InventoryItemId; delta: number };
}

export class EquipmentService {
  private readonly hydratedPlayers = new Set<string>();
  private readonly getInventoryService: () => Promise<InventoryServiceLike>;

  constructor(
    private readonly store: EquipmentStore,
    private readonly persistence: EquipmentPersistenceAdapter,
    getInventoryService?: () => Promise<InventoryServiceLike>,
  ) {
    // Use provided inventory service getter or default to runtime singleton
    this.getInventoryService = getInventoryService ?? defaultGetInventoryService;
  }

  async getPlayerEquipment(playerId: string): Promise<PlayerEquipmentState> {
    await this.hydratePlayer(playerId);
    return this.store.getPlayerEquipment(playerId);
  }

  /**
   * Atomic equip transaction.
   * - Validates player and item ownership
   * - Removes item from inventory
   * - Equips item to canonical slot
   * - If slot was occupied, returns old item to inventory
   * - Persists both inventory and equipment atomically
   */
  async equipItem(input: {
    playerId: string;
    itemId: string;
  }): Promise<AtomicEquipResult> {
    const { playerId, itemId } = input;

    // Reject invalid player
    if (!playerId || playerId === "anonymous") {
      return { ok: false, playerId, itemId, reason: "invalid_player" };
    }

    // Reject invalid item
    if (!isEquipmentItemId(itemId)) {
      return { ok: false, playerId, itemId, reason: "invalid_item" };
    }

    await this.hydratePlayer(playerId);

    const inventoryService = await this.getInventoryService();
    const inventory = await inventoryService.getPlayerInventory(playerId);

    // Check inventory ownership
    const inventorySlot = inventory.slots.find((slot) => slot.itemId === itemId && slot.quantity > 0);
    if (!inventorySlot) {
      return { ok: false, playerId, itemId, reason: "item_not_owned" };
    }

    // Get current equipment state
    const equipment = this.store.getPlayerEquipment(playerId);
    const itemDef = EQUIPMENT_DEFINITIONS[itemId];
    const targetSlotId = itemDef.slotId;

    // Check if slot is already occupied
    const existingSlot = equipment.slots.find((s) => s.slotId === targetSlotId);
    let unequippedItemId: string | undefined;

    // If slot occupied, unequip old item (returns to inventory)
    if (existingSlot) {
      unequippedItemId = existingSlot.itemId;
      const unequipResult = this.store.unequipItem({
        playerId,
        slotId: targetSlotId,
      });
      if (!unequipResult.ok) {
        // Slot unexpectedly invalid, shouldn't happen
        return { ok: false, playerId, itemId, reason: "invalid_item" };
      }
      // Add old item back to inventory
      const addBackResult = await inventoryService.addItem({
        playerId,
        itemId: existingSlot.itemId as InventoryItemId,
        quantity: 1,
      });
      if (!addBackResult.ok) {
        // Inventory full or other error - this is a real failure
        return { ok: false, playerId, itemId, reason: "item_not_owned" };
      }
    }

    // Remove item from inventory
    const removeResult = await inventoryService.removeItem({
      playerId,
      itemId: itemId as InventoryItemId,
      quantity: 1,
    });
    if (!removeResult.ok || !removeResult.state) {
      return { ok: false, playerId, itemId, reason: "item_not_owned" };
    }

    // Equip item to slot
    const equipResult = this.store.equipItem({
      playerId,
      itemId,
      ownsItem: true,
    });
    if (!equipResult.ok || !equipResult.equipment) {
      // This shouldn't happen if we validated correctly
      return { ok: false, playerId, itemId, reason: "invalid_item" };
    }

    // Persist both states atomically (best effort ordering)
    await this.persistence.savePlayerEquipment(
      createPersistedPlayerEquipmentState(playerId, equipResult.equipment),
    );
    await inventoryService.persistInventory(playerId, removeResult.state);

    return {
      ok: true,
      playerId,
      itemId,
      reason: "equipped",
      unequippedItemId,
      equipment: equipResult.equipment,
      inventoryDelta: { itemId: itemId as InventoryItemId, delta: -1 },
    };
  }

  /**
   * Atomic unequip transaction.
   * - Validates player and slot
   * - Removes item from equipment slot
   * - Returns item to inventory
   * - Persists both inventory and equipment atomically
   */
  async unequipItem(input: {
    playerId: string;
    slotId: EquipmentSlotId;
  }): Promise<AtomicUnequipResult> {
    const { playerId, slotId } = input;

    // Reject invalid player
    if (!playerId || playerId === "anonymous") {
      return { ok: false, playerId, slotId, reason: "invalid_player" };
    }

    await this.hydratePlayer(playerId);

    // Get current equipment state and check slot
    const equipment = this.store.getPlayerEquipment(playerId);
    const existingSlot = equipment.slots.find((s) => s.slotId === slotId);

    if (!existingSlot) {
      return { ok: false, playerId, slotId, reason: "slot_empty" };
    }

    const unequippedItemId = existingSlot.itemId;

    // Remove from equipment
    const unequipResult = this.store.unequipItem({ playerId, slotId });
    if (!unequipResult.ok || !unequipResult.equipment) {
      return { ok: false, playerId, slotId, reason: "slot_empty" };
    }

    // Add item back to inventory
    const inventoryService = await this.getInventoryService();
    const addResult = await inventoryService.addItem({
      playerId,
      itemId: unequippedItemId as InventoryItemId,
      quantity: 1,
    });

    if (!addResult.ok || !addResult.state) {
      // Inventory full - rollback equipment change
      return { ok: false, playerId, slotId, reason: "slot_empty" };
    }

    // Persist both states atomically (best effort ordering)
    await this.persistence.savePlayerEquipment(
      createPersistedPlayerEquipmentState(playerId, unequipResult.equipment),
    );
    await inventoryService.persistInventory(playerId, addResult.state);

    return {
      ok: true,
      playerId,
      slotId,
      reason: "unequipped",
      unequippedItemId,
      equipment: unequipResult.equipment,
      inventoryDelta: { itemId: unequippedItemId as InventoryItemId, delta: +1 },
    };
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

// Re-export types for convenience
export type { PlayerEquipmentState, EquipmentSlotId };
export type EquipItemResult = AtomicEquipResult;
export type UnequipItemResult = AtomicUnequipResult;