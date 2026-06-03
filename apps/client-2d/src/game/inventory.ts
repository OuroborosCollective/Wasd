import { getItemDefinition, type ItemStack } from "./items";

export interface InventorySlot {
  index: number;
  stack: ItemStack | null;
}

export interface InventoryState {
  slots: InventorySlot[];
}

export type InventoryEvent =
  | {
      type: "inventory_set";
      slots: InventorySlot[];
    }
  | {
      type: "inventory_add";
      itemId: string;
      quantity: number;
    }
  | {
      type: "inventory_remove";
      itemId: string;
      quantity: number;
    };

export function createInventory(slotCount = 24): InventoryState {
  return {
    slots: Array.from({ length: slotCount }, (_, index) => ({
      index,
      stack: null
    }))
  };
}

export function countInventoryItems(inventory: InventoryState): number {
  return inventory.slots.reduce((sum, slot) => {
    return sum + (slot.stack?.quantity ?? 0);
  }, 0);
}

export function applyInventoryEvent(
  inventory: InventoryState,
  event: InventoryEvent
): InventoryState {
  if (event.type === "inventory_set") {
    return {
      slots: event.slots.map((slot, index) => ({
        index,
        stack: slot.stack ? { ...slot.stack } : null
      }))
    };
  }

  if (event.type === "inventory_add") {
    return addItem(inventory, event.itemId, event.quantity);
  }

  if (event.type === "inventory_remove") {
    return removeItem(inventory, event.itemId, event.quantity);
  }

  return inventory;
}

export function addItem(
  inventory: InventoryState,
  itemId: string,
  quantity: number
): InventoryState {
  const def = getItemDefinition(itemId);
  if (!def || quantity <= 0) return inventory;

  let remaining = quantity;

  const slots = inventory.slots.map((slot) => ({
    index: slot.index,
    stack: slot.stack ? { ...slot.stack } : null
  }));

  // First pass: stack with existing items of same type
  for (const slot of slots) {
    if (!slot.stack || slot.stack.itemId !== itemId) continue;

    const free = def.maxStack - slot.stack.quantity;
    const move = Math.min(free, remaining);

    if (move > 0) {
      slot.stack.quantity += move;
      remaining -= move;
    }

    if (remaining <= 0) break;
  }

  // Second pass: fill empty slots
  for (const slot of slots) {
    if (remaining <= 0) break;
    if (slot.stack) continue;

    const move = Math.min(def.maxStack, remaining);
    slot.stack = {
      itemId,
      quantity: move
    };

    remaining -= move;
  }

  return { slots };
}

export function removeItem(
  inventory: InventoryState,
  itemId: string,
  quantity: number
): InventoryState {
  if (quantity <= 0) return inventory;

  let remaining = quantity;

  const slots = inventory.slots.map((slot) => ({
    index: slot.index,
    stack: slot.stack ? { ...slot.stack } : null
  }));

  for (const slot of slots) {
    if (!slot.stack || slot.stack.itemId !== itemId) continue;

    const move = Math.min(slot.stack.quantity, remaining);
    slot.stack.quantity -= move;
    remaining -= move;

    if (slot.stack.quantity <= 0) {
      slot.stack = null;
    }

    if (remaining <= 0) break;
  }

  return { slots };
}