/**
 * EQUIPMENT TYPES
 *
 * Deterministic equipment types for gathering tools, combat slots and paperdoll truth.
 * Canonical slot/item metadata is loaded from game-data/equipment at module init.
 * No Date.now(), no Math.random(), stable slot IDs and ordering.
 */

import fs from "node:fs";
import { isInventoryItemId, type InventoryItemId } from "../inventory/InventoryTypes.js";
import { resolveContentFile } from "../modules/content/contentDataRoot.js";

const KNOWN_EQUIPMENT_SLOT_IDS = [
  "amulet",
  "armor",
  "boots",
  "fishing_tool",
  "helmet",
  "mining_tool",
  "ring",
  "weapon",
  "woodcutting_tool",
] as const;

export type EquipmentSlotId = (typeof KNOWN_EQUIPMENT_SLOT_IDS)[number];
export type EquipmentSlotKind = "combat" | "armor" | "accessory" | "gathering_tool";
export type GatheringSkillId = "woodcutting" | "mining" | "fishing";

export interface EquipmentNumberEntry {
  key: string;
  value: number;
}

export interface EquipmentSlotDefinition {
  slotId: EquipmentSlotId;
  title: string;
  emptyTitle: string;
  kind: EquipmentSlotKind;
  order: number;
}

export interface EquipmentSkillBonus {
  skillId: GatheringSkillId;
  xpMultiplierPermille: number;
  gatherRespawnReductionTicks: number;
}

export interface EquipmentItemDefinition {
  itemId: InventoryItemId;
  slotId: EquipmentSlotId;
  title: string;
  /** Stable display identifier used by clients/atlases. */
  displayId?: string;
  /** Stable icon identifier used by clients/atlases. */
  iconId?: string;
  /** Tool/equipment tier. Tier 1 = starter, Tier 2 = upgrade. */
  tier: number;
  skillBonus?: EquipmentSkillBonus;
  stats?: readonly EquipmentNumberEntry[];
  requirements?: readonly EquipmentNumberEntry[];
}

export interface EquippedSlot {
  slotId: EquipmentSlotId;
  itemId: InventoryItemId;
  title: string;
  tier: number;
  displayId?: string;
  iconId?: string;
  /** Optional stats for procedural loot or authored game-data items. */
  stats?: ReadonlyArray<EquipmentNumberEntry>;
  requirements?: ReadonlyArray<EquipmentNumberEntry>;
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

export interface UnequipItemResult {
  ok: boolean;
  playerId: string;
  slotId: EquipmentSlotId;
  reason?: "unequipped" | "slot_empty" | "invalid_player";
  equipment?: PlayerEquipmentState;
}

const KNOWN_SLOT_ID_SET = new Set<string>(KNOWN_EQUIPMENT_SLOT_IDS);
const VALID_SLOT_KINDS = new Set<string>(["combat", "armor", "accessory", "gathering_tool"]);
const VALID_GATHERING_SKILLS = new Set<string>(["woodcutting", "mining", "fishing"]);

function compareStableString(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function readGameDataJson(relativePath: string): unknown {
  const filename = resolveContentFile(relativePath);
  try {
    return JSON.parse(fs.readFileSync(filename, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[EquipmentGameData] Failed to load ${relativePath}: ${message}`);
  }
}

export function isEquipmentSlotId(value: unknown): value is EquipmentSlotId {
  return typeof value === "string" && KNOWN_SLOT_ID_SET.has(value);
}

function assertObject(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`[EquipmentGameData] ${context} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`[EquipmentGameData] ${context} must be a non-empty string`);
  }
  return value.trim();
}

function assertInteger(value: unknown, context: string, min = 0): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) {
    throw new Error(`[EquipmentGameData] ${context} must be an integer >= ${min}`);
  }
  return n;
}

function normalizeNumberEntries(value: unknown, context: string): readonly EquipmentNumberEntry[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`[EquipmentGameData] ${context} must be an array`);
  }

  return value.map((entry, index) => {
    const record = assertObject(entry, `${context}[${index}]`);
    const key = assertString(record.key, `${context}[${index}].key`);
    const amount = Number(record.value);
    if (!Number.isFinite(amount)) {
      throw new Error(`[EquipmentGameData] ${context}[${index}].value must be finite`);
    }
    return { key, value: amount };
  }).sort((a, b) => compareStableString(a.key, b.key));
}

function normalizeSkillBonus(value: unknown, context: string): EquipmentSkillBonus | undefined {
  if (value === undefined || value === null) return undefined;
  const record = assertObject(value, context);
  const skillId = assertString(record.skillId, `${context}.skillId`);
  if (!VALID_GATHERING_SKILLS.has(skillId)) {
    throw new Error(`[EquipmentGameData] ${context}.skillId is not a known gathering skill: ${skillId}`);
  }

  return {
    skillId: skillId as GatheringSkillId,
    xpMultiplierPermille: assertInteger(record.xpMultiplierPermille, `${context}.xpMultiplierPermille`, 0),
    gatherRespawnReductionTicks: assertInteger(
      record.gatherRespawnReductionTicks,
      `${context}.gatherRespawnReductionTicks`,
      0,
    ),
  };
}

function loadEquipmentSlotDefinitions(): readonly EquipmentSlotDefinition[] {
  const root = assertObject(readGameDataJson("equipment/equipment-slots.json"), "equipment/equipment-slots.json");
  const slots = root.slots;
  if (!Array.isArray(slots)) {
    throw new Error("[EquipmentGameData] equipment/equipment-slots.json slots must be an array");
  }

  const seenSlots = new Set<EquipmentSlotId>();
  const seenOrders = new Set<number>();

  const normalized = slots.map((entry, index): EquipmentSlotDefinition => {
    const record = assertObject(entry, `equipment-slots[${index}]`);
    const slotId = assertString(record.slotId, `equipment-slots[${index}].slotId`);
    if (!isEquipmentSlotId(slotId)) {
      throw new Error(`[EquipmentGameData] Unknown equipment slotId: ${slotId}`);
    }
    if (seenSlots.has(slotId)) {
      throw new Error(`[EquipmentGameData] Duplicate equipment slotId: ${slotId}`);
    }
    seenSlots.add(slotId);

    const order = assertInteger(record.order, `equipment-slots[${index}].order`, 0);
    if (seenOrders.has(order)) {
      throw new Error(`[EquipmentGameData] Duplicate equipment slot order: ${order}`);
    }
    seenOrders.add(order);

    const kind = assertString(record.kind, `equipment-slots[${index}].kind`);
    if (!VALID_SLOT_KINDS.has(kind)) {
      throw new Error(`[EquipmentGameData] Unknown equipment slot kind: ${kind}`);
    }

    return {
      slotId,
      title: assertString(record.title, `equipment-slots[${index}].title`),
      emptyTitle: assertString(record.emptyTitle, `equipment-slots[${index}].emptyTitle`),
      kind: kind as EquipmentSlotKind,
      order,
    };
  }).sort((a, b) => (a.order - b.order) || compareStableString(a.slotId, b.slotId));

  const missing = KNOWN_EQUIPMENT_SLOT_IDS.filter((slotId) => !seenSlots.has(slotId));
  if (missing.length > 0) {
    throw new Error(`[EquipmentGameData] Missing canonical equipment slots: ${missing.join(", ")}`);
  }

  return normalized;
}

function loadEquipmentDefinitions(): Readonly<Record<string, EquipmentItemDefinition>> {
  const root = assertObject(readGameDataJson("equipment/equipment-items.json"), "equipment/equipment-items.json");
  const items = root.items;
  if (!Array.isArray(items)) {
    throw new Error("[EquipmentGameData] equipment/equipment-items.json items must be an array");
  }

  const byItemId: Record<string, EquipmentItemDefinition> = {};

  for (let index = 0; index < items.length; index++) {
    const record = assertObject(items[index], `equipment-items[${index}]`);
    const itemId = assertString(record.itemId, `equipment-items[${index}].itemId`);
    if (!isInventoryItemId(itemId)) {
      throw new Error(`[EquipmentGameData] Equipment item is not registered in inventory: ${itemId}`);
    }
    if (byItemId[itemId]) {
      throw new Error(`[EquipmentGameData] Duplicate equipment itemId: ${itemId}`);
    }

    const slotId = assertString(record.slotId, `equipment-items[${index}].slotId`);
    if (!isEquipmentSlotId(slotId)) {
      throw new Error(`[EquipmentGameData] Unknown equipment item slotId: ${slotId}`);
    }

    byItemId[itemId] = {
      itemId,
      slotId,
      title: assertString(record.title, `equipment-items[${index}].title`),
      displayId: typeof record.displayId === "string" ? record.displayId.trim() : undefined,
      iconId: typeof record.iconId === "string" ? record.iconId.trim() : undefined,
      tier: assertInteger(record.tier, `equipment-items[${index}].tier`, 1),
      skillBonus: normalizeSkillBonus(record.skillBonus, `equipment-items[${index}].skillBonus`),
      stats: normalizeNumberEntries(record.stats, `equipment-items[${index}].stats`),
      requirements: normalizeNumberEntries(record.requirements, `equipment-items[${index}].requirements`),
    };
  }

  return Object.fromEntries(
    Object.entries(byItemId).sort(([a], [b]) => compareStableString(a, b)),
  );
}

export const EQUIPMENT_SLOT_DEFINITIONS = loadEquipmentSlotDefinitions();
export const EQUIPMENT_SLOT_IDS = EQUIPMENT_SLOT_DEFINITIONS.map((slot) => slot.slotId) as readonly EquipmentSlotId[];
export const EQUIPMENT_SLOT_ORDER = new Map<EquipmentSlotId, number>(
  EQUIPMENT_SLOT_DEFINITIONS.map((slot, index) => [slot.slotId, index]),
);
export const EQUIPMENT_DEFINITIONS = loadEquipmentDefinitions();

export function compareEquipmentSlotIds(a: EquipmentSlotId, b: EquipmentSlotId): number {
  const orderA = EQUIPMENT_SLOT_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER;
  const orderB = EQUIPMENT_SLOT_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER;
  return (orderA - orderB) || compareStableString(a, b);
}

export function isEquipmentItemId(itemId: string): itemId is InventoryItemId {
  return Object.prototype.hasOwnProperty.call(EQUIPMENT_DEFINITIONS, itemId);
}

export function createEquippedSlotFromDefinition(definition: EquipmentItemDefinition): EquippedSlot {
  return {
    slotId: definition.slotId,
    itemId: definition.itemId,
    title: definition.title,
    tier: definition.tier,
    ...(definition.displayId ? { displayId: definition.displayId } : {}),
    ...(definition.iconId ? { iconId: definition.iconId } : {}),
    ...(definition.stats ? { stats: [...definition.stats] } : {}),
    ...(definition.requirements ? { requirements: [...definition.requirements] } : {}),
  };
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
    bySlot.set(definition.slotId, createEquippedSlotFromDefinition(definition));
  }

  return {
    playerId,
    schemaVersion: 1,
    slots: [...bySlot.values()].sort((a, b) => compareEquipmentSlotIds(a.slotId, b.slotId)),
  };
}
