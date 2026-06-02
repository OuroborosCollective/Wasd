/**
 * OUROBOROS SYSTEMIC EMERGENCE: CraftingDirector
 *
 * Authoritative NPC-Crafting Counterpart
 *
 * Conservation Axiom:
 * NPCs use real inventories and deterministic server-side craft intents.
 * No phantom crafting. No free item creation. No nondeterministic rolls.
 *
 * OVERCAP CRAFTING LOGIC:
 * - Every 10 skill levels = +1% base success chance
 * - When totalChance > 100%, excess becomes multi-yield chance
 * - Formula:
 *   guaranteedYield = floor(totalChance / 100)
 *   bonusChance = (totalChance % 100) / 100
 *   totalYield = guaranteedYield + deterministicBonusRoll
 *
 * Examples:
 * - 80%  => 0 guaranteed, 80% chance for 1 item
 * - 145% => 1 guaranteed, 45% chance for 2nd item
 * - 312% => 3 guaranteed, 12% chance for 4th item
 */

import { AREGuard } from "../../core/are/AREGuard.js";
import { AREHash } from "../../core/are/AREHash.js";
import { ItemRegistry } from "../inventory/ItemRegistry.js";
import { normalizeInventoryStacks } from "../inventory/inventoryStacks.js";
import { deterministicRandom } from "../../core/determinism/AREDeterminism.js";

// ─── Inventory Types ────────────────────────────────────────────────────────

export interface ModularItem {
  id: string;
  quantity?: number;
  [key: string]: unknown;
}

export interface NPCInventory {
  slots: (ModularItem | null)[];
  maxSlots: number;
  [key: string]: unknown;
}

// ─── Recipe Types ───────────────────────────────────────────────────────────

export interface CraftingRecipe {
  id: string;
  name: string;
  skill?: keyof PlayerSkills | string;
  requiredLevel: number;
  ingredients: Array<{ id: string; amount: number }>;
  result: { id: string; amount: number };
  xpReward?: number;
  storageType?: "none" | "basic" | "advanced";
}

export interface NPCCraftIntent {
  npcId: string;
  recipeId: string;
  tick: number;
}

// ─── Skill & Crafting Types ─────────────────────────────────────────────────

export interface PlayerSkills {
  carpentry: number;
  smithing: number;
  alchemy: number;
  enchanting: number;
  tailoring: number;
  masonry: number;
  cooking: number;
  herbalism: number;
}

export interface CraftingContext {
  playerId: string;
  tick: number;
  skills: PlayerSkills;
  playerLevel: number;
}

// ─── Result Types ───────────────────────────────────────────────────────────

export interface CraftingYieldResult {
  success: boolean;
  guaranteedYield: number;
  bonusChance: number;
  bonusRoll: boolean;
  totalYield: number;
  totalChance: number;
  skillBonus: number;
  xpGained?: number;
}

export interface NPCCraftResult {
  success: boolean;
  npcId: string;
  recipeId: string;
  item?: { id: string; quantity?: number };
  reason?: string;
  tick: number;
  kappaHash: string;
  yield?: CraftingYieldResult;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SKILL_LEVELS_PER_BONUS_PERCENT = 10;
const BASE_CRAFT_SUCCESS_CHANCE = 50;

// ─── Helpers ────────────────────────────────────────────────────────────────

function cloneSlots(slots: (ModularItem | null)[]): (ModularItem | null)[] {
  return slots.map((slot) => {
    if (!slot) return null;
    return { ...slot };
  });
}

function occupiedSlotCount(slots: (ModularItem | null)[]): number {
  return slots.reduce((count, slot) => count + (slot ? 1 : 0), 0);
}

function compactSlots(slots: (ModularItem | null)[]): (ModularItem | null)[] {
  return slots.filter((slot): slot is ModularItem => !!slot);
}

function commitSlots(target: NPCInventory, nextSlots: (ModularItem | null)[]): void {
  target.slots.length = 0;
  target.slots.push(...nextSlots);
}

function getSkillLevel(skills: PlayerSkills, skillName: string): number {
  const value = (skills as unknown as Record<string, number>)[skillName];
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

// ─── Overcap Crafting Logic ─────────────────────────────────────────────────

export function calculateOvercapYield(
  context: CraftingContext,
  recipeId: string,
  baseSuccessChance: number = BASE_CRAFT_SUCCESS_CHANCE
): CraftingYieldResult {
  const { playerId, tick, skills } = context;
  const recipe = craftingDirector.getRecipe(recipeId);

  if (!recipe) {
    return {
      success: false,
      guaranteedYield: 0,
      bonusChance: 0,
      bonusRoll: false,
      totalYield: 0,
      totalChance: 0,
      skillBonus: 0,
    };
  }

  const skillName = recipe.skill ?? "carpentry";
  const skillLevel = getSkillLevel(skills, skillName);

  // Correct logic: +1% per 10 skill levels.
  const skillBonus = Math.floor(skillLevel / SKILL_LEVELS_PER_BONUS_PERCENT);
  const totalChance = Math.max(0, Math.floor(baseSuccessChance + skillBonus));

  const guaranteedYield = Math.floor(totalChance / 100);
  const bonusChance = (totalChance % 100) / 100;

  const seed = `${playerId}:${tick}:craft:${recipeId}:skill:${skillName}:${skillLevel}:chance:${totalChance}`;
  const bonusRoll = deterministicRandom(seed) < bonusChance;

  const totalYield = guaranteedYield + (bonusRoll ? 1 : 0);
  const success = totalYield > 0;

  return {
    success,
    guaranteedYield,
    bonusChance,
    bonusRoll,
    totalYield,
    totalChance,
    skillBonus,
    xpGained: recipe.xpReward ? recipe.xpReward * totalYield : undefined,
  };
}

/**
 * Executes crafting with overcap multi-yield.
 *
 * Ingredients are consumed once.
 * Result amount is multiplied by totalYield.
 * Mutation is committed only after validation succeeds.
 */
export function executeOvercapCraft(
  context: CraftingContext,
  recipeId: string,
  npcInventory: NPCInventory
): NPCCraftResult {
  const { playerId, tick, playerLevel } = context;
  const recipe = craftingDirector.getRecipe(recipeId);

  if (!recipe) {
    return craftingDirector.buildFailureResult(playerId, recipeId, tick, "RECIPE_NOT_FOUND");
  }

  if (playerLevel < recipe.requiredLevel) {
    return craftingDirector.buildFailureResult(playerId, recipeId, tick, "LEVEL_TOO_LOW");
  }

  const yieldResult = calculateOvercapYield(context, recipeId);

  if (!yieldResult.success || yieldResult.totalYield <= 0) {
    return craftingDirector.buildFailureResult(playerId, recipeId, tick, "CRAFT_FAILED_NO_YIELD", yieldResult);
  }

  return craftingDirector.craftWithYield(
    playerId,
    npcInventory,
    recipeId,
    tick,
    yieldResult.totalYield,
    yieldResult
  );
}

// ─── Director ───────────────────────────────────────────────────────────────

export class CraftingDirector {
  private static instance: CraftingDirector;

  private recipes: Map<string, CraftingRecipe> = new Map();

  private readonly DEFAULT_RECIPES: CraftingRecipe[] = [
    {
      id: "wooden_chest_craft",
      name: "Wooden Chest",
      skill: "carpentry",
      requiredLevel: 1,
      ingredients: [{ id: "base:wood", amount: 5 }],
      result: { id: "base:chest", amount: 1 },
      storageType: "basic",
    },
    {
      id: "iron_chest_craft",
      name: "Iron Chest",
      skill: "smithing",
      requiredLevel: 3,
      ingredients: [
        { id: "base:iron_bar", amount: 8 },
        { id: "base:wood", amount: 3 },
      ],
      result: { id: "base:iron_chest", amount: 1 },
      storageType: "advanced",
    },
    {
      id: "wooden_shield_craft",
      name: "Wooden Shield",
      skill: "carpentry",
      requiredLevel: 1,
      ingredients: [{ id: "base:wood", amount: 3 }],
      result: { id: "base:wooden_shield", amount: 1 },
    },
    {
      id: "iron_sword_craft",
      name: "Iron Sword",
      skill: "smithing",
      requiredLevel: 2,
      ingredients: [
        { id: "base:iron_bar", amount: 2 },
        { id: "base:wood", amount: 1 },
      ],
      result: { id: "base:iron_sword", amount: 1 },
    },
    {
      id: "basic_pickaxe_craft",
      name: "Basic Pickaxe",
      skill: "masonry",
      requiredLevel: 1,
      ingredients: [
        { id: "base:wood", amount: 2 },
        { id: "base:stone", amount: 3 },
      ],
      result: { id: "base:pickaxe", amount: 1 },
    },
  ];

  private constructor() {
    this.loadDefaultRecipes();
  }

  public static getInstance(): CraftingDirector {
    if (!CraftingDirector.instance) {
      CraftingDirector.instance = new CraftingDirector();
    }
    return CraftingDirector.instance;
  }

  private loadDefaultRecipes(): void {
    for (const recipe of this.DEFAULT_RECIPES) {
      this.recipes.set(recipe.id, recipe);
    }
  }

  public registerRecipe(recipe: CraftingRecipe): void {
    AREGuard.executeProtected(() => {
      if (!recipe.id || !recipe.result?.id) {
        throw new Error("[CraftingDirector] Invalid recipe: missing id or result");
      }

      if (!Number.isFinite(recipe.requiredLevel) || recipe.requiredLevel < 0) {
        throw new Error(`[CraftingDirector] Invalid recipe level: ${recipe.id}`);
      }

      for (const ingredient of recipe.ingredients) {
        if (!ingredient.id || ingredient.amount <= 0) {
          throw new Error(`[CraftingDirector] Invalid ingredient in recipe: ${recipe.id}`);
        }
      }

      if (recipe.result.amount <= 0) {
        throw new Error(`[CraftingDirector] Invalid result amount in recipe: ${recipe.id}`);
      }

      this.recipes.set(recipe.id, recipe);
    });
  }

  public getRecipes(): CraftingRecipe[] {
    return Array.from(this.recipes.values());
  }

  public getRecipe(recipeId: string): CraftingRecipe | undefined {
    return this.recipes.get(recipeId);
  }

  public canCraft(npcInventory: NPCInventory, recipeId: string): { possible: boolean; reason?: string } {
    return AREGuard.executeProtected(() => {
      const recipe = this.recipes.get(recipeId);

      if (!recipe) {
        return { possible: false, reason: "RECIPE_NOT_FOUND" };
      }

      for (const ingredient of recipe.ingredients) {
        const haveCount = this.countItem(npcInventory.slots, ingredient.id);

        if (haveCount < ingredient.amount) {
          return {
            possible: false,
            reason: `MISSING_INGREDIENT:${ingredient.id}`,
          };
        }
      }

      return { possible: true };
    });
  }

  /**
   * Legacy/simple craft path.
   *
   * Uses deterministic inventory mutation and yields exactly one recipe result.
   * For skill-based overcap crafting, use executeOvercapCraft().
   */
  public craft(
    npcId: string,
    npcInventory: NPCInventory,
    recipeId: string,
    tick: number
  ): NPCCraftResult {
    return this.craftWithYield(npcId, npcInventory, recipeId, tick, 1);
  }

  /**
   * Authoritative atomic craft operation.
   *
   * This is the safe mutation core:
   * - clone inventory
   * - validate ingredients
   * - consume ingredients
   * - add deterministic result quantity
   * - normalize stacks
   * - validate slot cap
   * - commit mutation
   */
  public craftWithYield(
    npcId: string,
    npcInventory: NPCInventory,
    recipeId: string,
    tick: number,
    yieldCount: number,
    yieldResult?: CraftingYieldResult
  ): NPCCraftResult {
    return AREGuard.executeProtected(() => {
      const recipe = this.recipes.get(recipeId);

      if (!recipe) {
        return this.buildFailureResult(npcId, recipeId, tick, "RECIPE_NOT_FOUND", yieldResult);
      }

      const safeYield = Math.max(0, Math.floor(yieldCount));

      if (safeYield <= 0) {
        return this.buildFailureResult(npcId, recipeId, tick, "INVALID_YIELD", yieldResult);
      }

      const ingredientValidation = recipe.ingredients.map((ingredient) => ({
        id: ingredient.id,
        need: ingredient.amount,
        have: this.countItem(npcInventory.slots, ingredient.id),
      }));

      const missingIngredient = ingredientValidation.find((entry) => entry.have < entry.need);

      if (missingIngredient) {
        return this.buildFailureResult(
          npcId,
          recipeId,
          tick,
          `MISSING_INGREDIENT:${missingIngredient.id}`,
          yieldResult
        );
      }

      const nextSlots = cloneSlots(npcInventory.slots);

      for (const ingredient of recipe.ingredients) {
        this.removeItemAmount(nextSlots, ingredient.id, ingredient.amount);
      }

      const totalResultAmount = recipe.result.amount * safeYield;
      this.addItemAmount(nextSlots, recipe.result.id, totalResultAmount);

      normalizeInventoryStacks({
        inventory: nextSlots,
      } as unknown as { inventory: (ModularItem | null)[] });

      const compacted = compactSlots(nextSlots);

      if (occupiedSlotCount(compacted) > npcInventory.maxSlots) {
        return this.buildFailureResult(npcId, recipeId, tick, "INVENTORY_FULL", yieldResult);
      }

      commitSlots(npcInventory, compacted);

      const kappaHash = AREHash.hashObject({
        npcId,
        recipeId,
        tick,
        ingredients: ingredientValidation,
        result: {
          id: recipe.result.id,
          amount: totalResultAmount,
          yieldCount: safeYield,
        },
        yield: yieldResult
          ? {
              guaranteedYield: yieldResult.guaranteedYield,
              bonusChance: yieldResult.bonusChance,
              bonusRoll: yieldResult.bonusRoll,
              totalYield: yieldResult.totalYield,
              totalChance: yieldResult.totalChance,
              skillBonus: yieldResult.skillBonus,
            }
          : undefined,
      }).toString(16);

      return {
        success: true,
        npcId,
        recipeId,
        item: {
          id: recipe.result.id,
          quantity: totalResultAmount,
        },
        tick,
        kappaHash,
        yield: yieldResult,
      };
    });
  }

  public processIntent(intent: NPCCraftIntent, npcInventory: NPCInventory): NPCCraftResult {
    return this.craft(intent.npcId, npcInventory, intent.recipeId, intent.tick);
  }

  public getStorageRecipes(): CraftingRecipe[] {
    return this.getRecipes().filter((recipe) => recipe.storageType && recipe.storageType !== "none");
  }

  public isStorageRecipe(recipeId: string): boolean {
    const recipe = this.recipes.get(recipeId);
    return !!(recipe?.storageType && recipe.storageType !== "none");
  }

  public buildFailureResult(
    npcId: string,
    recipeId: string,
    tick: number,
    reason: string,
    yieldResult?: CraftingYieldResult
  ): NPCCraftResult {
    const kappaHash = AREHash.hashObject({
      npcId,
      recipeId,
      tick,
      failure: true,
      reason,
      yield: yieldResult
        ? {
            guaranteedYield: yieldResult.guaranteedYield,
            bonusChance: yieldResult.bonusChance,
            bonusRoll: yieldResult.bonusRoll,
            totalYield: yieldResult.totalYield,
            totalChance: yieldResult.totalChance,
            skillBonus: yieldResult.skillBonus,
          }
        : undefined,
    }).toString(16);

    return {
      success: false,
      npcId,
      recipeId,
      reason,
      tick,
      kappaHash,
      yield: yieldResult,
    };
  }

  private countItem(slots: (ModularItem | null)[], itemId: string): number {
    let count = 0;

    for (const slot of slots) {
      if (slot?.id === itemId) {
        count += slot.quantity ?? 1;
      }
    }

    return count;
  }

  private removeItemAmount(slots: (ModularItem | null)[], itemId: string, amount: number): void {
    let remaining = amount;

    for (let i = 0; i < slots.length && remaining > 0; i++) {
      const slot = slots[i];

      if (!slot || slot.id !== itemId) continue;

      const slotQty = slot.quantity ?? 1;

      if (slotQty <= remaining) {
        remaining -= slotQty;
        slots[i] = null;
      } else {
        slot.quantity = slotQty - remaining;
        remaining = 0;
      }
    }
  }

  private addItemAmount(slots: (ModularItem | null)[], itemId: string, amount: number): void {
    let toPlace = Math.max(0, Math.floor(amount));
    const maxStack = ItemRegistry.maxStackFor(ItemRegistry.getItem(itemId));

    while (toPlace > 0) {
      const stackSize = Math.min(maxStack, toPlace);
      const instance = ItemRegistry.createInstance(itemId, stackSize);

      if (instance) {
        slots.push(instance as ModularItem);
      } else {
        slots.push({
          id: itemId,
          quantity: stackSize,
        });
      }

      toPlace -= stackSize;
    }
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────

export const craftingDirector = CraftingDirector.getInstance();
