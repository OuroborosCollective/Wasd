/**
 * CRAFTING SERVICE
 *
 * Server-authoritative crafting service.
 * Deterministic: No Math.random(), no Date.now(), stable recipe ordering.
 * Station proximity required for station-bound recipes.
 */

import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import type { SkillSnapshot } from "../skills/SkillTypes.js";
import { ALL_CRAFTING_RECIPES } from "./StarterRecipes.js";
import { equipmentService } from "../equipment/equipmentRuntime.js";
import { EQUIPMENT_DEFINITIONS } from "../equipment/EquipmentTypes.js";
import {
  isWithinAnyStationOfType,
  getProcessingStationById,
} from "./ProcessingStations.js";
import type {
  CraftingRecipe,
  CraftingRecipeSnapshot,
  CraftingResult,
  RecipeIngredient,
  RecipeOutput,
} from "./CraftingTypes.js";

function craftingLevelFromSkills(skills: SkillSnapshot[]): number {
  return skills.find((skill) => skill.id === "crafting")?.level ?? 1;
}

function normalizeTick(value: unknown): number {
  const tick = Number(value ?? 0);
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
}

function inventoryFingerprint(slots: readonly { slotId?: string; itemId?: string; quantity?: number }[]): string {
  return slots
    .map((slot) => `${slot.slotId ?? ""}:${slot.itemId ?? ""}:${Math.max(0, Math.floor(Number(slot.quantity ?? 0)))}`)
    .sort()
    .join(",");
}

function recipeFingerprint(recipe: CraftingRecipe): string {
  const ingredients = [...recipe.ingredients]
    .map((entry) => `${entry.itemId}:${entry.quantity}`)
    .sort()
    .join(",");
  const outputs = [...recipe.outputs]
    .map((entry) => `${entry.itemId}:${entry.quantity}`)
    .sort()
    .join(",");
  return `${recipe.id}|${recipe.requiredLevel}|${recipe.craftTicks}|${recipe.stationType ?? "none"}|${ingredients}|${outputs}`;
}

function craftHash(input: {
  playerId: string;
  recipe: CraftingRecipe;
  currentTick: number;
  inventoryBefore: string;
}): string {
  return stableHash32([
    "CRAFT_DELTA_V1",
    input.playerId,
    input.recipe.id,
    input.currentTick,
    recipeFingerprint(input.recipe),
    input.inventoryBefore,
  ].join("|")).toString(16);
}

export class CraftingService {
  private readonly recipes = new Map<string, CraftingRecipe>();

  constructor(recipes: readonly CraftingRecipe[] = ALL_CRAFTING_RECIPES) {
    for (const recipe of recipes) {
      this.recipes.set(recipe.id, recipe);
    }
  }

  listRecipes(): CraftingRecipe[] {
    return [...this.recipes.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  async listRecipeSnapshots(playerId: string): Promise<CraftingRecipeSnapshot[]> {
    const skillService = await getSkillProgressionService();
    await skillService.hydratePlayer(playerId);
    const skillState = await skillService.getPlayerSkillState(playerId);
    const craftingLevel = craftingLevelFromSkills(skillState.skills);

    const inventoryService = await getInventoryService();

    return Promise.all(
      this.listRecipes().map(async (recipe) => {
        const hasIngredients = await inventoryService.hasItems({
          playerId,
          items: [...recipe.ingredients],
        });

        const levelOk = craftingLevel >= recipe.requiredLevel;

        return {
          ...recipe,
          ingredients: [...recipe.ingredients],
          outputs: [...recipe.outputs],
          craftable: levelOk && hasIngredients,
          blockedReason: !levelOk
            ? "level_too_low"
            : !hasIngredients
              ? "missing_ingredients"
              : undefined,
        };
      }),
    );
  }

  async craft(input: {
    playerId: string;
    recipeId: string;
    playerPosition?: { x: number; y: number };
    stationId?: string;
    currentTick?: number;
  }): Promise<CraftingResult> {
    const currentTick = normalizeTick(input.currentTick);

    if (!input.playerId || input.playerId === "anonymous") {
      return {
        ok: false,
        playerId: input.playerId,
        recipeId: input.recipeId,
        reason: "invalid_player",
      };
    }

    const recipe = this.recipes.get(input.recipeId);
    if (!recipe) {
      return {
        ok: false,
        playerId: input.playerId,
        recipeId: input.recipeId,
        reason: "recipe_not_found",
      };
    }

    if (recipe.stationType) {
      if (!input.playerPosition) {
        return {
          ok: false,
          playerId: input.playerId,
          recipeId: recipe.id,
          reason: "missing_player_position",
        };
      }

      if (
        !Number.isFinite(input.playerPosition.x) ||
        !Number.isFinite(input.playerPosition.y)
      ) {
        return {
          ok: false,
          playerId: input.playerId,
          recipeId: recipe.id,
          reason: "invalid_player_position",
        };
      }

      if (input.stationId) {
        const station = getProcessingStationById(input.stationId);
        if (!station) {
          return {
            ok: false,
            playerId: input.playerId,
            recipeId: recipe.id,
            reason: "station_too_far",
          };
        }
        if (station.type !== recipe.stationType) {
          return {
            ok: false,
            playerId: input.playerId,
            recipeId: recipe.id,
            reason: "station_type_mismatch",
          };
        }
        const distanceResult = isWithinAnyStationOfType(input.playerPosition, recipe.stationType);
        if (!distanceResult.withinRange || distanceResult.station?.id !== input.stationId) {
          return {
            ok: false,
            playerId: input.playerId,
            recipeId: recipe.id,
            reason: "station_too_far",
          };
        }
      } else {
        const distanceResult = isWithinAnyStationOfType(input.playerPosition, recipe.stationType);
        if (!distanceResult.withinRange) {
          return {
            ok: false,
            playerId: input.playerId,
            recipeId: recipe.id,
            reason: "station_too_far",
          };
        }
      }
    }

    const skillService = await getSkillProgressionService();
    await skillService.hydratePlayer(input.playerId);
    const skillState = await skillService.getPlayerSkillState(input.playerId);
    const craftingLevel = craftingLevelFromSkills(skillState.skills);

    if (craftingLevel < recipe.requiredLevel) {
      return {
        ok: false,
        playerId: input.playerId,
        recipeId: recipe.id,
        reason: "level_too_low",
      };
    }

    const inventoryService = await getInventoryService();
    const beforeState = await inventoryService.getPlayerInventory(input.playerId);
    const deltaHash = craftHash({
      playerId: input.playerId,
      recipe,
      currentTick,
      inventoryBefore: inventoryFingerprint(beforeState.slots),
    });

    const hasIngredients = await inventoryService.hasItems({
      playerId: input.playerId,
      items: [...recipe.ingredients],
    });

    if (!hasIngredients) {
      return {
        ok: false,
        playerId: input.playerId,
        recipeId: recipe.id,
        reason: "missing_ingredients",
      };
    }

    const removedIngredients: RecipeIngredient[] = [];
    const addedOutputs: RecipeOutput[] = [];
    const originUids: string[] = [];

    const restoreIngredients = async () => {
      for (let index = removedIngredients.length - 1; index >= 0; index -= 1) {
        const ingredient = removedIngredients[index];
        await inventoryService.addItem({
          playerId: input.playerId,
          itemId: ingredient.itemId,
          quantity: ingredient.quantity,
          origin: {
            uid: `craft:${deltaHash}:restore:${index}`,
            tick: currentTick,
            source: "system_delta",
            sourceHash: deltaHash,
          },
        });
      }
    };

    for (const ingredient of recipe.ingredients) {
      const removed = await inventoryService.removeItem({
        playerId: input.playerId,
        itemId: ingredient.itemId,
        quantity: ingredient.quantity,
      });

      if (!removed.ok) {
        await restoreIngredients();
        return {
          ok: false,
          playerId: input.playerId,
          recipeId: recipe.id,
          reason: "missing_ingredients",
        };
      }

      removedIngredients.push({ itemId: ingredient.itemId, quantity: ingredient.quantity });
    }

    for (let index = 0; index < recipe.outputs.length; index += 1) {
      const output = recipe.outputs[index];
      const uid = `craft:${deltaHash}:output:${index}`;
      const added = await inventoryService.addItem({
        playerId: input.playerId,
        itemId: output.itemId,
        quantity: output.quantity,
        origin: {
          uid,
          tick: currentTick,
          source: "crafting_delta",
          sourceHash: deltaHash,
        },
      });

      if (!added.ok) {
        for (const addedOutput of addedOutputs) {
          await inventoryService.removeItem({
            playerId: input.playerId,
            itemId: addedOutput.itemId,
            quantity: addedOutput.quantity,
          });
        }
        await restoreIngredients();
        return {
          ok: false,
          playerId: input.playerId,
          recipeId: recipe.id,
          reason: "inventory_full",
        };
      }

      addedOutputs.push({ itemId: output.itemId, quantity: output.quantity });
      originUids.push(uid);
    }

    for (const ingredient of recipe.ingredients) {
      const consumedDef = EQUIPMENT_DEFINITIONS[ingredient.itemId];
      if (consumedDef) {
        const equipment = await equipmentService.getPlayerEquipment(input.playerId);
        const equippedSlot = equipment.slots.find((slot) => slot.itemId === ingredient.itemId);

        if (equippedSlot) {
          await equipmentService.unequipItem({
            playerId: input.playerId,
            slotId: equippedSlot.slotId,
          });
        }
      }
    }

    for (const output of recipe.outputs) {
      const outputDef = EQUIPMENT_DEFINITIONS[output.itemId];
      if (outputDef) {
        await equipmentService.equipItem({
          playerId: input.playerId,
          itemId: output.itemId,
        });
      }
    }

    await skillService.applyEvent({
      type: "skill_xp_gain",
      playerId: input.playerId,
      skillId: "crafting",
      amount: recipe.craftingXpReward,
      source: "crafting",
    });

    return {
      ok: true,
      playerId: input.playerId,
      recipeId: recipe.id,
      reason: "crafted",
      consumed: [...recipe.ingredients],
      outputs: [...recipe.outputs],
      craftingXpReward: recipe.craftingXpReward,
      currentTick,
      craftHash: deltaHash,
      originUids: Object.freeze(originUids),
    } as CraftingResult;
  }
}

export const craftingService = new CraftingService();
