/**
 * LOOT EQUIPMENT SLOTS
 *
 * Equipment slot definitions for procedural loot items.
 * Extends the base EquipmentTypes.ts with slots for combat/equipment loot.
 *
 * Base type to slot mapping:
 * - sword / axe / staff / bow → weapon
 * - chest / armor → armor
 * - helmet → helmet
 * - boots → boots
 * - ring → ring
 * - amulet → amulet
 *
 * Gathering tools (woodcutting_tool, mining_tool, fishing_tool) remain unchanged.
 *
 * Deterministic: No Math.random(), no Date.now().
 */

import type { EquipmentSlotId } from "./EquipmentTypes.js";

/**
 * Extended equipment slot IDs including combat/equipment slots.
 */
export type LootEquipmentSlotId =
  | EquipmentSlotId
  | "weapon"
  | "armor"
  | "helmet"
  | "boots"
  | "ring"
  | "amulet";

/**
 * Slot categories for procedural loot.
 */
export type LootSlotCategory =
  | "weapon"
  | "armor"
  | "helmet"
  | "boots"
  | "accessory"
  | "gathering";

/**
 * Mapping from base type patterns to equipment slot IDs.
 * Used when generating loot to determine which slot an item occupies.
 */
const BASE_TYPE_TO_SLOT: Readonly<Record<string, LootEquipmentSlotId>> = Object.freeze({
  // Weapons
  sword: "weapon",
  axe: "weapon",
  staff: "weapon",
  bow: "weapon",
  dagger: "weapon",
  spear: "weapon",
  mace: "weapon",
  greatsword: "weapon",

  // Armor
  chest: "armor",
  armor: "armor",
  vest: "armor",
  robe: "armor",
  tunic: "armor",

  // Helmet
  helmet: "helmet",
  hood: "helmet",
  circlet: "helmet",
  helm: "helmet",
  head: "helmet",
  cap: "helmet",

  // Boots
  boots: "boots",
  greaves: "boots",
  sandals: "boots",
  shoes: "boots",
  boot: "boots",

  // Ring
  ring: "ring",

  // Amulet
  amulet: "amulet",
  necklace: "amulet",
  pendant: "amulet",
});

/**
 * Get the equipment slot for a given base type.
 * Returns null if the base type doesn't map to a slot.
 */
export function getSlotForBaseType(baseType: string): LootEquipmentSlotId | null {
  const normalized = baseType.toLowerCase().trim();
  return BASE_TYPE_TO_SLOT[normalized] ?? null;
}

/**
 * Get the slot category for a given slot ID.
 */
export function getSlotCategory(slotId: LootEquipmentSlotId): LootSlotCategory {
  switch (slotId) {
    case "weapon":
      return "weapon";
    case "armor":
      return "armor";
    case "helmet":
      return "helmet";
    case "boots":
      return "boots";
    case "ring":
    case "amulet":
      return "accessory";
    case "woodcutting_tool":
    case "mining_tool":
    case "fishing_tool":
      return "gathering";
    default:
      return "accessory";
  }
}

/**
 * Check if a slot is a gathering tool slot.
 */
export function isGatheringSlot(slotId: string): boolean {
  return (
    slotId === "woodcutting_tool" ||
    slotId === "mining_tool" ||
    slotId === "fishing_tool"
  );
}

/**
 * Check if a slot is a combat/equipment slot.
 */
export function isCombatSlot(slotId: string): boolean {
  return (
    slotId === "weapon" ||
    slotId === "armor" ||
    slotId === "helmet" ||
    slotId === "boots" ||
    slotId === "ring" ||
    slotId === "amulet"
  );
}

/**
 * All combat/equipment slot IDs (non-gathering).
 */
export const COMBAT_SLOT_IDS: readonly LootEquipmentSlotId[] = Object.freeze([
  "weapon",
  "armor",
  "helmet",
  "boots",
  "ring",
  "amulet",
]);

/**
 * All gathering tool slot IDs.
 */
export const GATHERING_SLOT_IDS: readonly EquipmentSlotId[] = Object.freeze([
  "woodcutting_tool",
  "mining_tool",
  "fishing_tool",
]);

/**
 * All slot IDs (combat + gathering).
 */
export const ALL_SLOT_IDS: readonly LootEquipmentSlotId[] = Object.freeze([
  ...COMBAT_SLOT_IDS,
  ...GATHERING_SLOT_IDS,
]);