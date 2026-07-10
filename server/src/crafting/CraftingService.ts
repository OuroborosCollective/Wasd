import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import type { SkillSnapshot } from "../skills/SkillTypes.js";
import { ALL_CRAFTING_RECIPES } from "./StarterRecipes.js";
import {
  getProcessingStationById,
  isWithinAnyStationOfType,
} from "./ProcessingStations.js";
import type {
  CraftingRecipe,
  CraftingRecipeSnapshot,
  CraftingResult,
} from "./CraftingTypes.js";

function craftingLevelFromSkills(skills: SkillSnapshot[]): number {
  return skills.find((skill) => skill.id === "crafting")?.level ?? 1;
}

function validTick(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function validOperationId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9:_./-]{1,192}$/.test(value);
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

function craftHash(operationId: string, recipe: CraftingRecipe): string {
  return stableHash32(["CRAFT_DELTA_V2", operationId, recipeFingerprint(recipe)].join("|")).toString(16);
}

function outputOriginUids(operationId: string, recipe: CraftingRecipe): readonly string[] {
  return Object.freeze(recipe.outputs.map((_output, index) => `craft:${operationId}:output:${index}`));
}

export class CraftingService {
  private readonly recipes = new Map<string, CraftingRecipe>();
  private readonly playerLocks = new Map<string, Promise<void>>();

  public constructor(recipes: readonly CraftingRecipe[] = ALL_CRAFTING_RECIPES) {
    for (const recipe of recipes) this.recipes.set(recipe.id, recipe);
  }

  public listRecipes(): CraftingRecipe[] {
    return [...this.recipes.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  public async listRecipeSnapshots(
    playerId: string,
    playerPosition?: { x: number; y: number },
  ): Promise<CraftingRecipeSnapshot[]> {
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
        const stationResult = recipe.stationType
          ? playerPosition
            ? isWithinAnyStationOfType(playerPosition, recipe.stationType)
            : null
          : undefined;
        const stationOk = !recipe.stationType || stationResult?.withinRange === true;
        const blockedReason = !levelOk
          ? "level_too_low" as const
          : !hasIngredients
            ? "missing_ingredients" as const
            : recipe.stationType && !playerPosition
              ? "missing_player_position" as const
              : !stationOk
                ? "station_too_far" as const
                : undefined;

        return {
          ...recipe,
          ingredients: [...recipe.ingredients],
          outputs: [...recipe.outputs],
          craftable: levelOk && hasIngredients && stationOk,
          blockedReason,
        };
      }),
    );
  }

  public async craft(input: {
    playerId: string;
    recipeId: string;
    playerPosition?: { x: number; y: number };
    stationId?: string;
    currentTick?: number;
    operationId?: string;
  }): Promise<CraftingResult> {
    return this.runExclusive(input.playerId || "invalid", () => this.craftLocked(input));
  }

  private async craftLocked(input: {
    playerId: string;
    recipeId: string;
    playerPosition?: { x: number; y: number };
    stationId?: string;
    currentTick?: number;
    operationId?: string;
  }): Promise<CraftingResult> {
    if (!input.playerId || input.playerId === "anonymous") {
      return { ok: false, playerId: input.playerId, recipeId: input.recipeId, reason: "invalid_player" };
    }
    if (!validTick(input.currentTick)) {
      return { ok: false, playerId: input.playerId, recipeId: input.recipeId, reason: "invalid_tick" };
    }
    if (!validOperationId(input.operationId)) {
      return { ok: false, playerId: input.playerId, recipeId: input.recipeId, reason: "invalid_operation_id" };
    }

    const recipe = this.recipes.get(input.recipeId);
    if (!recipe) {
      return { ok: false, playerId: input.playerId, recipeId: input.recipeId, reason: "recipe_not_found" };
    }

    if (recipe.stationType) {
      if (!input.playerPosition) {
        return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "missing_player_position" };
      }
      if (!Number.isFinite(input.playerPosition.x) || !Number.isFinite(input.playerPosition.y)) {
        return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "invalid_player_position" };
      }
      if (input.stationId) {
        const station = getProcessingStationById(input.stationId);
        if (!station) {
          return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "station_too_far" };
        }
        if (station.type !== recipe.stationType) {
          return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "station_type_mismatch" };
        }
        const distance = isWithinAnyStationOfType(input.playerPosition, recipe.stationType);
        if (!distance.withinRange || distance.station?.id !== input.stationId) {
          return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "station_too_far" };
        }
      } else if (!isWithinAnyStationOfType(input.playerPosition, recipe.stationType).withinRange) {
        return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "station_too_far" };
      }
    }

    const skillService = await getSkillProgressionService();
    await skillService.hydratePlayer(input.playerId);
    const skillState = await skillService.getPlayerSkillState(input.playerId);
    if (craftingLevelFromSkills(skillState.skills) < recipe.requiredLevel) {
      return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "level_too_low" };
    }

    const inventoryService = await getInventoryService();
    const originUids = outputOriginUids(input.operationId, recipe);
    const appliedOrigins = inventoryService.getAppliedOriginUids(input.playerId);
    const replayMatches = originUids.filter((uid) => appliedOrigins.includes(uid)).length;
    const deltaHash = craftHash(input.operationId, recipe);
    if (replayMatches === originUids.length) {
      return {
        ok: true,
        playerId: input.playerId,
        recipeId: recipe.id,
        reason: "crafted",
        consumed: [...recipe.ingredients],
        outputs: [...recipe.outputs],
        craftingXpReward: recipe.craftingXpReward,
        currentTick: input.currentTick,
        craftHash: deltaHash,
        originUids,
        replayed: true,
      };
    }
    if (replayMatches > 0) {
      return {
        ok: false,
        playerId: input.playerId,
        recipeId: recipe.id,
        reason: "transaction_failed",
        rollbackOk: false,
      };
    }

    const hasIngredients = await inventoryService.hasItems({
      playerId: input.playerId,
      items: [...recipe.ingredients],
    });
    if (!hasIngredients) {
      return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "missing_ingredients" };
    }

    const inventoryBefore = await inventoryService.getPlayerInventory(input.playerId);
    const originsBefore = inventoryService.getAppliedOriginUids(input.playerId);
    const movementCountBefore = inventoryService.getMovementEventCount();
    const skillsBefore = await skillService.getPlayerSkillState(input.playerId);
    let failureReason: "inventory_full" | "transaction_failed" = "transaction_failed";

    try {
      for (const ingredient of recipe.ingredients) {
        const removed = await inventoryService.removeItem({
          playerId: input.playerId,
          itemId: ingredient.itemId,
          quantity: ingredient.quantity,
        });
        if (!removed.ok) throw new Error("ingredient_remove_failed");
      }

      for (let index = 0; index < recipe.outputs.length; index += 1) {
        const output = recipe.outputs[index];
        const added = await inventoryService.addItem({
          playerId: input.playerId,
          itemId: output.itemId,
          quantity: output.quantity,
          origin: {
            uid: originUids[index],
            tick: input.currentTick,
            source: "crafting_delta",
            sourceHash: deltaHash,
          },
        });
        if (!added.ok) {
          failureReason = "inventory_full";
          throw new Error("output_add_failed");
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
        currentTick: input.currentTick,
        craftHash: deltaHash,
        originUids,
        replayed: false,
      };
    } catch {
      const recovery = await Promise.allSettled([
        inventoryService.restorePlayerInventory(
          input.playerId,
          inventoryBefore,
          originsBefore,
          movementCountBefore,
        ),
        skillService.restorePlayerSkillState(input.playerId, skillsBefore),
      ]);
      const rollbackOk = recovery.every((entry) => entry.status === "fulfilled");
      return {
        ok: false,
        playerId: input.playerId,
        recipeId: recipe.id,
        reason: rollbackOk ? failureReason : "transaction_recovery_failed",
        rollbackOk,
      };
    }
  }

  private async runExclusive<T>(playerId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.playerLocks.get(playerId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => gate);
    this.playerLocks.set(playerId, tail);
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.playerLocks.get(playerId) === tail) this.playerLocks.delete(playerId);
    }
  }
}

export const craftingService = new CraftingService();
