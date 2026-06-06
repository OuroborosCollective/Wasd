/**
 * INVENTORY TYPES
 *
 * Server-authoritative inventory types for gathered resource items.
 * Deterministic: No Date.now(), no Math.random(), stable item IDs and ordering.
 */

export type InventoryItemId =
  | "wood_log"
  | "copper_ore"
  | "raw_fish"
  | "wood_plank"
  | "copper_ingot"
  | "cooked_fish";

export interface InventoryItemDefinition {
  id: InventoryItemId;
  name: string;
  stackable: boolean;
  maxStack: number;
  category: "resource" | "quest" | "consumable" | "equipment";
}

export interface InventorySlot {
  slotId: string;
  itemId: InventoryItemId;
  name: string;
  quantity: number;
  category: InventoryItemDefinition["category"];
  stackable: boolean;
  maxStack: number;
}

export interface PlayerInventoryState {
  playerId: string;
  schemaVersion: 1;
  slots: InventorySlot[];
  capacity: number;
}

export interface InventoryAddResult {
  ok: boolean;
  playerId: string;
  itemId: InventoryItemId;
  quantity: number;
  reason?: "added" | "invalid_item" | "invalid_quantity" | "inventory_full";
  state?: PlayerInventoryState;
}

export interface InventoryRemoveResult {
  ok: boolean;
  playerId: string;
  itemId: InventoryItemId;
  quantity: number;
  reason?: "removed" | "invalid_item" | "invalid_quantity" | "not_enough_items";
  state?: PlayerInventoryState;
}

export const INVENTORY_CAPACITY = 32;

export const ITEM_DEFINITIONS: Record<InventoryItemId, InventoryItemDefinition> = {
  wood_log: {
    id: "wood_log",
    name: "Wood Log",
    stackable: true,
    maxStack: 999,
    category: "resource",
  },
  copper_ore: {
    id: "copper_ore",
    name: "Copper Ore",
    stackable: true,
    maxStack: 999,
    category: "resource",
  },
  raw_fish: {
    id: "raw_fish",
    name: "Raw Fish",
    stackable: true,
    maxStack: 999,
    category: "resource",
  },
  wood_plank: {
    id: "wood_plank",
    name: "Wood Plank",
    stackable: true,
    maxStack: 999,
    category: "resource",
  },
  copper_ingot: {
    id: "copper_ingot",
    name: "Copper Ingot",
    stackable: true,
    maxStack: 999,
    category: "resource",
  },
  cooked_fish: {
    id: "cooked_fish",
    name: "Cooked Fish",
    stackable: true,
    maxStack: 999,
    category: "consumable",
  },
};

export function isInventoryItemId(value: unknown): value is InventoryItemId {
  return typeof value === "string" && value in ITEM_DEFINITIONS;
}

export function normalizeQuantity(value: unknown): number {
  const quantity = Math.floor(Number(value));
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, quantity);
}

export function createDefaultInventoryState(playerId: string): PlayerInventoryState {
  return {
    playerId,
    schemaVersion: 1,
    slots: [],
    capacity: INVENTORY_CAPACITY,
  };
}

export function normalizeInventorySlot(slot: Partial<InventorySlot>): InventorySlot | null {
  if (!isInventoryItemId(slot.itemId)) return null;

  const definition = ITEM_DEFINITIONS[slot.itemId];
  const quantity = normalizeQuantity(slot.quantity);

  if (quantity <= 0) return null;

  return {
    slotId: String(slot.slotId || `slot_${definition.id}`),
    itemId: definition.id,
    name: definition.name,
    quantity: Math.min(quantity, definition.maxStack),
    category: definition.category,
    stackable: definition.stackable,
    maxStack: definition.maxStack,
  };
}

export function normalizePlayerInventoryState(
  input: Partial<PlayerInventoryState> | null | undefined,
  playerId: string,
): PlayerInventoryState {
  const slots = new Map<InventoryItemId, InventorySlot>();

  for (const rawSlot of input?.slots ?? []) {
    const slot = normalizeInventorySlot(rawSlot);
    if (!slot) continue;

    const existing = slots.get(slot.itemId);
    if (existing && slot.stackable) {
      slots.set(slot.itemId, {
        ...existing,
        quantity: Math.min(existing.quantity + slot.quantity, slot.maxStack),
      });
    } else {
      slots.set(slot.itemId, slot);
    }
  }

  return {
    playerId,
    schemaVersion: 1,
    capacity: INVENTORY_CAPACITY,
    slots: [...slots.values()].sort((a, b) => a.itemId.localeCompare(b.itemId)),
  };
}