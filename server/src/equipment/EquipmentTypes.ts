/**
 * EQUIPMENT TYPES
 *
 * Deterministic equipment types for gathering tools.
 * No Date.now(), no Math.random(), stable slot IDs and ordering.
 */

import type { InventoryItemId } from "../inventory/InventoryTypes.js";

export type EquipmentSlotId =
  | "woodcutting_tool"
  | "mining_tool"
  | "fishing_tool";

export interface EquipmentItemDefinition {
  itemId: InventoryItemId;
  slotId: EquipmentSlotId;
  title: string;
  skillBonus: {
    skillId: "woodcutting" | "mining" | "fishing";
    xpMultiplierPermille: number;
    gatherRespawnReductionTicks: number;
  };
}

export interface EquippedSlot {
  slotId: EquipmentSlotId;
  itemId: InventoryItemId;
  title: string;
}

export interface PlayerEquipmentState {
  playerId: string;
  schemaVersion: 1;
  slots: EquippedSlot[];
}

export interface EquipItemResult {
  ok: boolean;
  playerId: string;
  itemId: string;
  reason?:
    | "equipped"
    | "invalid_item"
    | "item_not_owned"
    | "wrong_slot"
    | "invalid_player";
  equipment?: PlayerEquipmentState;
}

export const EQUIPMENT_DEFINITIONS: Record<string, EquipmentItemDefinition> = {
  wooden_axe: {
    itemId: "wooden_axe",
    slotId: "woodcutting_tool",
    title: "Wooden Axe",
    skillBonus: {
      skillId: "woodcutting",
      xpMultiplierPermille: 1100,
      gatherRespawnReductionTicks: 2,
    },
  },
  copper_pickaxe: {
    itemId: "copper_pickaxe",
    slotId: "mining_tool",
    title: "Copper Pickaxe",
    skillBonus: {
      skillId: "mining",
      xpMultiplierPermille: 1100,
      gatherRespawnReductionTicks: 2,
    },
  },
  simple_fishing_rod: {
    itemId: "simple_fishing_rod",
    slotId: "fishing_tool",
    title: "Simple Fishing Rod",
    skillBonus: {
      skillId: "fishing",
      xpMultiplierPermille: 1100,
      gatherRespawnReductionTicks: 2,
    },
  },
};

export function isEquipmentItemId(itemId: string): itemId is keyof typeof EQUIPMENT_DEFINITIONS {
  return itemId in EQUIPMENT_DEFINITIONS;
}

export function createDefaultEquipmentState(playerId: string): PlayerEquipmentState {
  return {
    playerId,
    schemaVersion: 1,
    slots: [],
  };
}

export function normalizeEquipmentState(
  input: Partial<PlayerEquipmentState> | null | undefined,
  playerId: string,
): PlayerEquipmentState {
  const bySlot = new Map<EquipmentSlotId, EquippedSlot>();

  for (const raw of input?.slots ?? []) {
    if (!raw || typeof raw !== "object") continue;
    if (!isEquipmentItemId(String(raw.itemId))) continue;

    const definition = EQUIPMENT_DEFINITIONS[String(raw.itemId)];

    bySlot.set(definition.slotId, {
      slotId: definition.slotId,
      itemId: definition.itemId,
      title: definition.title,
    });
  }

  return {
    playerId,
    schemaVersion: 1,
    slots: [...bySlot.values()].sort((a, b) => a.slotId.localeCompare(b.slotId)),
  };
}