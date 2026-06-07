/**
 * CRAFTING SERVICE
 *
 * Server-authoritative crafting service.
 * Deterministic: No Math.random(), no Date.now(), stable recipe ordering.
 * Station proximity required for recipes with stationType.
 */

import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import type { SkillSnapshot } from "../skills/SkillTypes.js";
import { ALL_CRAFTING_RECIPES } from "./StarterRecipes.js";
import {
  isWithinAnyStationOfType,
  getProcessingStationById,
} from "./ProcessingStations.js";
import type {
  CraftingRecipe,
  CraftingRecipeSnapshot,
  CraftingResult,
  RecipeId,
} from "./CraftingTypes.js";

function craftingLevelFromSkills(skills: SkillSnapshot[]): number {
  return skills.find((skill) => skill.id === "crafting")?.level ?? 1;
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
          items: recipe.ingredients,
        });

        const levelOk = craftingLevel >= recipe.requiredLevel;

        return {
          ...recipe,
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
  }): Promise<CraftingResult> {
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

    // Station proximity check for recipes that require a station
    if (recipe.stationType) {
      // Player position is required for station-bound recipes
      if (!input.playerPosition) {
        return {
          ok: false,
          playerId: input.playerId,
          recipeId: recipe.id,
          reason: "missing_player_position",
        };
      }

      // Validate player position is finite
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

      // If stationId provided, verify it matches the required station type
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
        // Check if player is within this station's radius
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
        // No stationId provided - find nearest station of required type
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
    const hasIngredients = await inventoryService.hasItems({
      playerId: input.playerId,
      items: recipe.ingredients,
    });

    if (!hasIngredients) {
      return {
        ok: false,
        playerId: input.playerId,
        recipeId: recipe.id,
        reason: "missing_ingredients",
      };
    }

    // Consume ingredients
    for (const ingredient of recipe.ingredients) {
      const removed = await inventoryService.removeItem({
        playerId: input.playerId,
        itemId: ingredient.itemId,
        quantity: ingredient.quantity,
      });

      if (!removed.ok) {
        return {
          ok: false,
          playerId: input.playerId,
          recipeId: recipe.id,
          reason: "missing_ingredients",
        };
      }
    }

    // Add outputs
    for (const output of recipe.outputs) {
      const added = await inventoryService.addItem({
        playerId: input.playerId,
        itemId: output.itemId,
        quantity: output.quantity,
      });

      if (!added.ok) {
        return {
          ok: false,
          playerId: input.playerId,
          recipeId: recipe.id,
          reason: "inventory_full",
        };
      }
    }

    // Grant crafting XP
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
      consumed: recipe.ingredients,
      outputs: recipe.outputs,
      craftingXpReward: recipe.craftingXpReward,
    };
  }
}

export const craftingService = new CraftingService();