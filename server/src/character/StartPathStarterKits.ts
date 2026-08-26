/**
 * START PATH STARTER KITS
 *
 * Classless starter support for Areloria character creation.
 * These are NOT classes. They only grant deterministic starter resources,
 * tutorial intent, and a first resource/crafting direction.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now()
 * - Stable ordering
 * - No skill locks
 * - Idempotent grants: repeated application never duplicates starter resources
 */

import { getInventoryService } from "../inventory/inventoryRuntime.js";
import type { InventoryItemId } from "../inventory/InventoryTypes.js";
import type { CharacterArchetype } from "./CharacterTypes.js";

export interface StartPathStarterGrant {
  readonly itemId: InventoryItemId;
  readonly quantity: number;
}

export interface StartPathStarterKit {
  readonly archetype: CharacterArchetype;
  readonly tutorialFocus: string;
  readonly firstResourceSpotId: string | null;
  readonly firstGoal: string;
  readonly grants: readonly StartPathStarterGrant[];
}

export const START_PATH_STARTER_KITS: Record<CharacterArchetype, StartPathStarterKit> = {
  wanderer: {
    archetype: "wanderer",
    tutorialFocus: "movement_npc_dialogue_first_combat",
    firstResourceSpotId: null,
    firstGoal: "talk_to_first_npc",
    grants: [
      { itemId: "cooked_fish", quantity: 1 },
      { itemId: "wood_log", quantity: 1 },
    ],
  },
  forager: {
    archetype: "forager",
    tutorialFocus: "woodcutting_and_nature_gathering",
    firstResourceSpotId: "starter_tree_001",
    firstGoal: "gather_3_nature_materials",
    grants: [
      { itemId: "wood_log", quantity: 2 },
    ],
  },
  miner: {
    archetype: "miner",
    tutorialFocus: "mining_and_smelting_intro",
    firstResourceSpotId: "starter_ore_001",
    firstGoal: "mine_3_copper_ore",
    grants: [
      { itemId: "copper_ore", quantity: 2 },
    ],
  },
  angler: {
    archetype: "angler",
    tutorialFocus: "fishing_and_cooking_intro",
    firstResourceSpotId: "starter_fish_001",
    firstGoal: "catch_3_raw_fish",
    grants: [
      { itemId: "raw_fish", quantity: 2 },
    ],
  },
  artisan: {
    archetype: "artisan",
    tutorialFocus: "crafting_recipe_intro",
    firstResourceSpotId: null,
    firstGoal: "craft_first_plank_or_ingot",
    grants: [
      { itemId: "wood_log", quantity: 2 },
      { itemId: "copper_ore", quantity: 3 },
    ],
  },
};

export function getStartPathStarterKit(archetype: CharacterArchetype): StartPathStarterKit {
  return START_PATH_STARTER_KITS[archetype] ?? START_PATH_STARTER_KITS.wanderer;
}

export function getStarterGrantQuantity(archetype: CharacterArchetype, itemId: string): number {
  const kit = getStartPathStarterKit(archetype);
  return kit.grants
    .filter((grant) => grant.itemId === itemId)
    .reduce((total, grant) => total + Math.max(0, Math.floor(grant.quantity)), 0);
}

export async function applyStartPathStarterKit(input: {
  readonly playerId: string;
  readonly archetype: CharacterArchetype;
}): Promise<void> {
  const kit = getStartPathStarterKit(input.archetype);
  const inventory = await getInventoryService();

  for (const grant of kit.grants) {
    const alreadyHasGrant = await inventory.hasItems({
      playerId: input.playerId,
      items: [{ itemId: grant.itemId, quantity: grant.quantity }],
    });

    if (alreadyHasGrant) {
      continue;
    }

    const result = await inventory.addItem({
      playerId: input.playerId,
      itemId: grant.itemId,
      quantity: grant.quantity,
    });

    if (!result.ok) {
      console.warn(
        `[start-path] failed to grant ${grant.itemId} x${grant.quantity} to ${input.playerId}: ${result.reason}`,
      );
    }
  }
}
