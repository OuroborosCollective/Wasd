/**
 * START PATH QUEST LINE
 *
 * Deterministic, classless first-goal quest snapshots for character start paths.
 * These quests are derived from server-authoritative inventory state and do not
 * introduce classes, skill locks, or client-side completion decisions.
 */

import type { PlayerInventoryState } from "../inventory/InventoryTypes.js";
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

export function createStartPathQuestSnapshot(input: {
  readonly character: CharacterProfileSnapshot | null;
  readonly inventory: PlayerInventoryState | null;
}): QuestSnapshot | null {
  const { character, inventory } = input;
  if (!character) return null;

  const kit = getStartPathStarterKit(character.archetype);

  if (character.archetype === "forager") {
    const required = 3;
    const current = clampObjectiveCurrent(inventoryQuantity(inventory, "wood_log"), required);
    return normalizeQuestSnapshot({
      id: "start_path_forager",
      title: "Startpfad: Forager",
      description: `Sammle Naturmaterialien am ersten Ressourcen-Spot (${kit.firstResourceSpotId ?? "starter area"}). Reward-Line: Woodcutting XP + Wood Logs.`,
      status: current >= required ? "completed" : "active",
      objectives: [
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
      status: current >= required ? "completed" : "active",
      objectives: [
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
      status: current >= required ? "completed" : "active",
      objectives: [
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
      status: current >= required ? "completed" : "active",
      objectives: [
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
    status: current >= required ? "completed" : "active",
    objectives: [
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
