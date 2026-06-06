/**
 * INVENTORY STORE
 *
 * Server-authoritative in-memory inventory store.
 * Deterministic: No Math.random(), stable ordering, no Date.now().
 */

import {
  INVENTORY_CAPACITY,
  ITEM_DEFINITIONS,
  createDefaultInventoryState,
  isInventoryItemId,
  normalizePlayerInventoryState,
  normalizeQuantity,
  type InventoryAddResult,
  type InventoryRemoveResult,
  type InventoryItemId,
  type PlayerInventoryState,
} from "./InventoryTypes.js";

export class InventoryStore {
  private readonly inventories = new Map<string, PlayerInventoryState>();

  getPlayerInventory(playerId: string): PlayerInventoryState {
    const existing = this.inventories.get(playerId);
    if (existing) return normalizePlayerInventoryState(existing, playerId);

    const created = createDefaultInventoryState(playerId);
    this.inventories.set(playerId, created);
    return created;
  }

  addItem(input: {
    playerId: string;
    itemId: InventoryItemId | string;
    quantity: number;
  }): InventoryAddResult {
    if (!input.playerId || input.playerId === "anonymous") {
      return {
        ok: false,
        playerId: input.playerId,
        itemId: "wood_log",
        quantity: 0,
        reason: "invalid_item",
      };
    }

    if (!isInventoryItemId(input.itemId)) {
      return {
        ok: false,
        playerId: input.playerId,
        itemId: "wood_log",
        quantity: 0,
        reason: "invalid_item",
      };
    }

    const quantity = normalizeQuantity(input.quantity);
    if (quantity <= 0) {
      return {
        ok: false,
        playerId: input.playerId,
        itemId: input.itemId,
        quantity: 0,
        reason: "invalid_quantity",
      };
    }

    const definition = ITEM_DEFINITIONS[input.itemId];
    const state = this.getPlayerInventory(input.playerId);
    const existing = state.slots.find((slot) => slot.itemId === definition.id);

    if (existing && definition.stackable) {
      const nextState = normalizePlayerInventoryState(
        {
          ...state,
          slots: state.slots.map((slot) =>
            slot.itemId === definition.id
              ? {
                  ...slot,
                  quantity: Math.min(slot.quantity + quantity, definition.maxStack),
                }
              : slot,
          ),
        },
        input.playerId,
      );

      this.inventories.set(input.playerId, nextState);

      return {
        ok: true,
        playerId: input.playerId,
        itemId: definition.id,
        quantity,
        reason: "added",
        state: nextState,
      };
    }

    if (state.slots.length >= INVENTORY_CAPACITY) {
      return {
        ok: false,
        playerId: input.playerId,
        itemId: definition.id,
        quantity,
        reason: "inventory_full",
        state,
      };
    }

    const nextState = normalizePlayerInventoryState(
      {
        ...state,
        slots: [
          ...state.slots,
          {
            slotId: `slot_${definition.id}`,
            itemId: definition.id,
            name: definition.name,
            quantity,
            category: definition.category,
            stackable: definition.stackable,
            maxStack: definition.maxStack,
          },
        ],
      },
      input.playerId,
    );

    this.inventories.set(input.playerId, nextState);

    return {
      ok: true,
      playerId: input.playerId,
      itemId: definition.id,
      quantity,
      reason: "added",
      state: nextState,
    };
  }

  replacePlayerInventory(playerId: string, state: PlayerInventoryState): void {
    this.inventories.set(playerId, normalizePlayerInventoryState(state, playerId));
  }

  removeItem(input: {
    playerId: string;
    itemId: InventoryItemId | string;
    quantity: number;
  }): InventoryRemoveResult {
    if (!isInventoryItemId(input.itemId)) {
      return {
        ok: false,
        playerId: input.playerId,
        itemId: "wood_log",
        quantity: 0,
        reason: "invalid_item",
      };
    }

    const quantity = normalizeQuantity(input.quantity);
    if (quantity <= 0) {
      return {
        ok: false,
        playerId: input.playerId,
        itemId: input.itemId,
        quantity: 0,
        reason: "invalid_quantity",
      };
    }

    const state = this.getPlayerInventory(input.playerId);
    const existing = state.slots.find((slot) => slot.itemId === input.itemId);

    if (!existing || existing.quantity < quantity) {
      return {
        ok: false,
        playerId: input.playerId,
        itemId: input.itemId,
        quantity,
        reason: "not_enough_items",
        state,
      };
    }

    const nextSlots =
      existing.quantity === quantity
        ? state.slots.filter((slot) => slot.itemId !== input.itemId)
        : state.slots.map((slot) =>
            slot.itemId === input.itemId
              ? { ...slot, quantity: slot.quantity - quantity }
              : slot,
          );

    const nextState = normalizePlayerInventoryState(
      {
        ...state,
        slots: nextSlots,
      },
      input.playerId,
    );

    this.inventories.set(input.playerId, nextState);

    return {
      ok: true,
      playerId: input.playerId,
      itemId: input.itemId,
      quantity,
      reason: "removed",
      state: nextState,
    };
  }

  hasItems(input: {
    playerId: string;
    items: Array<{ itemId: InventoryItemId; quantity: number }>;
  }): boolean {
    const state = this.getPlayerInventory(input.playerId);

    return input.items.every((required) => {
      const slot = state.slots.find((candidate) => candidate.itemId === required.itemId);
      return Boolean(slot && slot.quantity >= required.quantity);
    });
  }

  clearForTests(): void {
    this.inventories.clear();
  }
}