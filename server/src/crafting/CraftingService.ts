import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import type { InventoryService } from "../inventory/InventoryService.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import type { PlayerSkillState, SkillSnapshot } from "../skills/SkillTypes.js";
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
import {
  createCraftingReceipt,
  type CraftingReceiptPersistenceAdapter,
  type PersistedCraftingReceipt,
} from "./CraftingReceiptPersistence.js";
import { JsonCraftingReceiptPersistenceAdapter } from "./JsonCraftingReceiptPersistenceAdapter.js";

interface CraftingSkillRuntime {
  hydratePlayer(playerId: string): Promise<void>;
  getPlayerSkillState(playerId: string): Promise<PlayerSkillState>;
  applyEvent(event: {
    type: "skill_xp_gain";
    playerId: string;
    skillId: "crafting";
    amount: number;
    source: "crafting";
  }): Promise<unknown>;
  restorePlayerSkillState(playerId: string, state: PlayerSkillState): Promise<void>;
}

export interface CraftingServiceDependencies {
  readonly inventoryService?: InventoryService;
  readonly skillService?: CraftingSkillRuntime;
  readonly receiptPersistence?: CraftingReceiptPersistenceAdapter;
}

function craftingLevelFromSkills(skills: SkillSnapshot[]): number {
  return skills.find((skill) => skill.id === "crafting")?.level ?? 1;
}

function craftingXpFromSkills(skills: SkillSnapshot[]): number {
  return skills.find((skill) => skill.id === "crafting")?.xp ?? 0;
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

function sameReceiptContract(
  receipt: PersistedCraftingReceipt,
  input: { playerId: string; recipeId: string; craftHash: string; originUids: readonly string[] },
): boolean {
  return receipt.playerId === input.playerId &&
    receipt.recipeId === input.recipeId &&
    receipt.craftHash === input.craftHash &&
    receipt.originUids.length === input.originUids.length &&
    receipt.originUids.every((uid, index) => uid === input.originUids[index]);
}

export class CraftingService {
  private readonly recipes = new Map<string, CraftingRecipe>();
  private readonly playerLocks = new Map<string, Promise<void>>();
  /** Compatibility test hooks; production resolves through injected/runtime services. */
  private _inventoryService?: InventoryService;
  private _skillService?: CraftingSkillRuntime;
  private _receiptPersistence?: CraftingReceiptPersistenceAdapter;

  public constructor(
    recipes: readonly CraftingRecipe[] = ALL_CRAFTING_RECIPES,
    private readonly dependencies: CraftingServiceDependencies = {},
  ) {
    for (const recipe of recipes) this.recipes.set(recipe.id, recipe);
  }

  public listRecipes(): CraftingRecipe[] {
    return [...this.recipes.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  public async listRecipeSnapshots(
    playerId: string,
    playerPosition?: { x: number; y: number },
  ): Promise<CraftingRecipeSnapshot[]> {
    const skillService = await this.resolveSkillService();
    await skillService.hydratePlayer(playerId);
    const skillState = await skillService.getPlayerSkillState(playerId);
    const craftingLevel = craftingLevelFromSkills(skillState.skills);
    const inventoryService = await this.resolveInventoryService();

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

    const skillService = await this.resolveSkillService();
    const inventoryService = await this.resolveInventoryService();
    const receiptPersistence = await this.resolveReceiptPersistence();
    await skillService.hydratePlayer(input.playerId);

    const deltaHash = craftHash(input.operationId, recipe);
    const originUids = outputOriginUids(input.operationId, recipe);
    const existingReceipt = await receiptPersistence.loadReceipt(input.operationId);
    if (existingReceipt) {
      if (!sameReceiptContract(existingReceipt, {
        playerId: input.playerId,
        recipeId: recipe.id,
        craftHash: deltaHash,
        originUids,
      })) {
        return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "transaction_failed", rollbackOk: false };
      }
      if (existingReceipt.status === "prepared") {
        const recovery = await Promise.allSettled([
          inventoryService.restorePlayerInventory(
            input.playerId,
            existingReceipt.inventoryBefore,
            existingReceipt.appliedOriginUidsBefore,
            existingReceipt.movementEventCountBefore,
          ),
          skillService.restorePlayerSkillState(input.playerId, existingReceipt.skillsBefore),
          receiptPersistence.deleteReceipt(input.operationId),
        ]);
        if (!recovery.every((entry) => entry.status === "fulfilled")) {
          return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "transaction_recovery_failed", rollbackOk: false };
        }
      } else {
        const appliedOrigins = inventoryService.getAppliedOriginUids(input.playerId);
        const skillState = await skillService.getPlayerSkillState(input.playerId);
        const receiptValid = originUids.every((uid) => appliedOrigins.includes(uid)) &&
          craftingXpFromSkills(skillState.skills) >= existingReceipt.expectedCraftingXpAfter;
        if (!receiptValid) {
          return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "transaction_failed", rollbackOk: false };
        }
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
          receiptHash: existingReceipt.receiptHash,
          originUids,
          replayed: true,
        };
      }
    }

    const skillState = await skillService.getPlayerSkillState(input.playerId);
    if (craftingLevelFromSkills(skillState.skills) < recipe.requiredLevel) {
      return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "level_too_low" };
    }
    const appliedOrigins = inventoryService.getAppliedOriginUids(input.playerId);
    if (originUids.some((uid) => appliedOrigins.includes(uid))) {
      return { ok: false, playerId: input.playerId, recipeId: recipe.id, reason: "transaction_failed", rollbackOk: false };
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
    const expectedCraftingXpAfter = craftingXpFromSkills(skillsBefore.skills) + recipe.craftingXpReward;
    const preparedReceipt = createCraftingReceipt({
      operationId: input.operationId,
      playerId: input.playerId,
      recipeId: recipe.id,
      craftHash: deltaHash,
      originUids,
      status: "prepared",
      inventoryBefore,
      appliedOriginUidsBefore: originsBefore,
      movementEventCountBefore: movementCountBefore,
      skillsBefore,
      expectedCraftingXpAfter,
    });
    let failureReason: "inventory_full" | "transaction_failed" = "transaction_failed";

    try {
      await receiptPersistence.saveReceipt(preparedReceipt);
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
      const skillsAfter = await skillService.getPlayerSkillState(input.playerId);
      if (craftingXpFromSkills(skillsAfter.skills) < expectedCraftingXpAfter) {
        throw new Error("crafting_xp_commit_unverified");
      }
      const committedReceipt = createCraftingReceipt({
        operationId: preparedReceipt.operationId,
        playerId: preparedReceipt.playerId,
        recipeId: preparedReceipt.recipeId,
        craftHash: preparedReceipt.craftHash,
        originUids: preparedReceipt.originUids,
        status: "committed",
        inventoryBefore: preparedReceipt.inventoryBefore,
        appliedOriginUidsBefore: preparedReceipt.appliedOriginUidsBefore,
        movementEventCountBefore: preparedReceipt.movementEventCountBefore,
        skillsBefore: preparedReceipt.skillsBefore,
        expectedCraftingXpAfter: preparedReceipt.expectedCraftingXpAfter,
      });
      await receiptPersistence.saveReceipt(committedReceipt);

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
        receiptHash: committedReceipt.receiptHash,
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
        receiptPersistence.deleteReceipt(input.operationId),
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

  private async resolveInventoryService(): Promise<InventoryService> {
    return this._inventoryService ?? this.dependencies.inventoryService ?? getInventoryService();
  }

  private async resolveSkillService(): Promise<CraftingSkillRuntime> {
    return this._skillService ?? this.dependencies.skillService ?? getSkillProgressionService();
  }

  private async resolveReceiptPersistence(): Promise<CraftingReceiptPersistenceAdapter> {
    if (this._receiptPersistence) return this._receiptPersistence;
    this._receiptPersistence = this.dependencies.receiptPersistence ?? new JsonCraftingReceiptPersistenceAdapter();
    return this._receiptPersistence;
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
