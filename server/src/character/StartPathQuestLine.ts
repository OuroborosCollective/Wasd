/**
 * START PATH QUEST LINE
 *
 * Deterministic, classless first-goal quest snapshots for character start paths.
 * These quests are derived from server-authoritative inventory state and do not
 * introduce classes, skill locks, or client-side completion decisions.
 */

import type { PlayerInventoryState } from "../inventory/InventoryTypes.js";
import type { PlayerEquipmentState } from "../equipment/EquipmentTypes.js";
import { normalizeQuestSnapshot, type QuestSnapshot } from "../quests/QuestSnapshotTypes.js";
import type { CharacterProfileSnapshot } from "./CharacterTypes.js";
import { getStartPathStarterKit } from "./StartPathStarterKits.js";

function inventoryQuantity(inventory: PlayerInventoryState | null | undefined, itemId: string): number {
  const slot = inventory?.slots.find((entry) => entry.itemId === itemId);
  return Math.max(0, Math.floor(Number(slot?.quantity ?? 0)));
}

function clampObjectiveCurrent(current: number, required: number): number {
  return Math.max(0, Math.min(required, Math.floor(current)));
}

/**
 * Required tool slots for complete tool setup.
 */
const REQUIRED_TOOL_SLOTS = ["mining_tool", "fishing_tool"] as const;

/**
 * Count how many required tool slots are equipped.
 */
function countEquippedTools(equipment: PlayerEquipmentState | null | undefined): number {
  if (!equipment?.slots?.length) return 0;
  const equippedSlots = new Set(equipment.slots.map((s) => s.slotId));
  return REQUIRED_TOOL_SLOTS.filter((slot) => equippedSlots.has(slot)).length;
}

/**
 * Check if the player has all required gathering tools equipped.
 */
function hasAllRequiredTools(equipment: PlayerEquipmentState | null | undefined): boolean {
  if (!equipment?.slots?.length) return false;
  const equippedSlots = new Set(equipment.slots.map((s) => s.slotId));
  return REQUIRED_TOOL_SLOTS.every((slot) => equippedSlots.has(slot));
}

export function createStartPathQuestSnapshot(input: {
  readonly character: CharacterProfileSnapshot | null;
  readonly inventory: PlayerInventoryState | null;
  readonly equipment?: PlayerEquipmentState | null;
}): QuestSnapshot | null {
  const { character, inventory, equipment } = input;
  if (!character) return null;

  const kit = getStartPathStarterKit(character.archetype);

  // Tool equipping objective - shared across all archetypes
  const equippedToolsCount = countEquippedTools(equipment);
  const hasTools = hasAllRequiredTools(equipment);

  if (character.archetype === "forager") {
    const required = 3;
    const current = clampObjectiveCurrent(inventoryQuantity(inventory, "wood_log"), required);
    return normalizeQuestSnapshot({
      id: "start_path_forager",
      title: "Startpfad: Forager",
      description: `Sammle Naturmaterialien am ersten Ressourcen-Spot (${kit.firstResourceSpotId ?? "starter area"}). Reward-Line: Woodcutting XP + Wood Logs.`,
      status: hasTools && current >= required ? "completed" : "active",
      objectives: [
        {
          id: "equip_gathering_tools",
          label: "Rüste Werkzeuge aus",
          current: equippedToolsCount,
          required: REQUIRED_TOOL_SLOTS.length,
          completed: hasTools,
        },
        {
          id: "collect_wood_logs",
          label: "Sammle 3 Wood Logs",
          current,
          required,
          completed: current >= required,
        },
      ],
    });
  }

  if (character.archetype === "miner") {
    const required = 3;
    const current = clampObjectiveCurrent(inventoryQuantity(inventory, "copper_ore"), required);
    return normalizeQuestSnapshot({
      id: "start_path_miner",
      title: "Startpfad: Miner",
      description: `Baue Kupfer am ersten Ressourcen-Spot ab (${kit.firstResourceSpotId ?? "starter area"}). Reward-Line: Mining XP + Copper Ore.`,
      status: hasTools && current >= required ? "completed" : "active",
      objectives: [
        {
          id: "equip_gathering_tools",
          label: "Rüste Werkzeuge aus",
          current: equippedToolsCount,
          required: REQUIRED_TOOL_SLOTS.length,
          completed: hasTools,
        },
        {
          id: "collect_copper_ore",
          label: "Sammle 3 Copper Ore",
          current,
          required,
          completed: current >= required,
        },
      ],
    });
  }

  if (character.archetype === "angler") {
    const required = 3;
    const current = clampObjectiveCurrent(inventoryQuantity(inventory, "raw_fish"), required);
    return normalizeQuestSnapshot({
      id: "start_path_angler",
      title: "Startpfad: Angler",
      description: `Fange Fische am ersten Ressourcen-Spot (${kit.firstResourceSpotId ?? "starter area"}). Reward-Line: Fishing XP + Raw Fish, danach Cooking/Crafting.`,
      status: hasTools && current >= required ? "completed" : "active",
      objectives: [
        {
          id: "equip_gathering_tools",
          label: "Rüste Werkzeuge aus",
          current: equippedToolsCount,
          required: REQUIRED_TOOL_SLOTS.length,
          completed: hasTools,
        },
        {
          id: "catch_raw_fish",
          label: "Fange 3 Raw Fish",
          current,
          required,
          completed: current >= required,
        },
      ],
    });
  }

  if (character.archetype === "artisan") {
    const required = 1;
    const current = clampObjectiveCurrent(inventoryQuantity(inventory, "wood_plank"), required);
    return normalizeQuestSnapshot({
      id: "start_path_artisan",
      title: "Startpfad: Artisan",
      description: "Verarbeite Startmaterialien an der Werkbank. Reward-Line: Crafting XP + verarbeitete Materialien.",
      status: hasTools && current >= required ? "completed" : "active",
      objectives: [
        {
          id: "equip_gathering_tools",
          label: "Rüste Werkzeuge aus",
          current: equippedToolsCount,
          required: REQUIRED_TOOL_SLOTS.length,
          completed: hasTools,
        },
        {
          id: "craft_wood_plank",
          label: "Fertige 1 Wood Plank",
          current,
          required,
          completed: current >= required,
        },
      ],
    });
  }

  const required = 1;
  const current = clampObjectiveCurrent(inventoryQuantity(inventory, "cooked_fish"), required);
  return normalizeQuestSnapshot({
    id: "start_path_wanderer",
    title: "Startpfad: Wanderer",
    description: "Nutze deinen Basisvorrat und folge der First-Steps-Quest. Reward-Line: erster Kampf, erster NPC, erste sichere Versorgung.",
    status: hasTools && current >= required ? "completed" : "active",
    objectives: [
      {
        id: "equip_gathering_tools",
        label: "Rüste Werkzeuge aus",
        current: equippedToolsCount,
        required: REQUIRED_TOOL_SLOTS.length,
        completed: hasTools,
      },
      {
        id: "secure_basic_supplies",
        label: "Sichere deinen Basisvorrat",
        current,
        required,
        completed: current >= required,
      },
    ],
  });
}
