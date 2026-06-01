/**
 * OUROBOROS SYSTEMIC EMERGENCE: CraftingDirector
 * 
 * Authoritative NPC-Crafting Counterpart
 * 
 * Axiom der Erhaltung (Conservation Axiom):
 * NPCs use EXACTLY the same systems as players. When an NPC crafts,
 * it sends a deterministic CRAFT intent to the server. The NPC
 * needs real items in its inventory - no phantom crafting.
 * 
 * OVERCAP CRAFTING LOGIC:
 * - Every 10 skill levels = +1% base success chance
 * - When totalChance > 100%, excess becomes multi-yield chance
 * - Formula: yield = floor(totalChance / 100), bonusChance = totalChance % 100
 * - Example: 145% = 100% guaranteed + 45% chance for 2nd item
 * - Example: 312% = 300% = 3 guaranteed + 12% chance for 4th item
 */

import { AREGuard } from '../../core/are/AREGuard.js';
import { AREHash } from '../../core/are/AREHash.js';
import { ItemRegistry } from '../inventory/ItemRegistry.js';
import { normalizeInventoryStacks } from '../inventory/inventoryStacks.js';
import { deterministicRandom } from '../../core/determinism/AREDeterminism.js';

export interface NPCInventory {
  slots: (ModularItem | null)[];
  maxSlots: number;
  [key: string]: unknown;
}

export interface ModularItem {
  id: string;
  quantity?: number;
  [key: string]: unknown;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  skill?: string;
  requiredLevel: number;
  ingredients: Array<{ id: string; amount: number }>;
  result: { id: string; amount: number };
  xpReward?: number;
  storageType?: 'none' | 'basic' | 'advanced';
}

// ─── Skill & Crafting Types ─────────────────────────────────────────

export interface PlayerSkills {
  carpentry: number;     // Woodworking & storage
  smithing: number;      // Metalwork & weapons
  alchemy: number;       // Potions & consumables
  enchanting: number;   // Rune enchantments
  tailoring: number;    // Cloth & leather
  masonry: number;      // Stone construction
  cooking: number;      // Food & buffs
  herbalism: number;     // Gathering & plants
}

export interface CraftingContext {
  playerId: string;
  tick: number;
  skills: PlayerSkills;
  playerLevel: number;
}

// ─── Crafting Result Types ─────────────────────────────────────────

export interface CraftingYieldResult {
  success: boolean;
  baseAmount: number;      // floor(totalChance / 100)
  bonusChance: number;     // (totalChance % 100) / 100
  bonusRoll: boolean;       // Did we get an extra?
  totalYield: number;       // baseAmount + (bonusRoll ? 1 : 0)
  totalChance: number;      // Raw calculated chance
  skillBonus: number;       // Skill level contribution
  xpGained?: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const SKILL_BONUS_PER_10_LEVELS = 1;  // +1% per 10 skill levels
const BASE_CRAFT_SUCCESS_CHANCE = 50;  // 50% base success chance

// ─── Overcap Crafting Logic ────────────────────────────────────────

/**
 * Calculate crafting yield using overcap multi-yield system.
 * 
 * Formula:
 *   totalChance = baseChance + floor(skillLevel / 10)
 *   baseAmount = floor(totalChance / 100)  // Guaranteed items
 *   bonusChance = (totalChance % 100) / 100  // Decimal portion as probability
 *   bonusRoll = deterministicChance(seed, bonusChance)
 *   totalYield = baseAmount + (bonusRoll ? 1 : 0)
 * 
 * Examples:
 *   - 80% = 0 guaranteed, 80% chance for 1
 *   - 145% = 1 guaranteed, 45% chance for 2nd
 *   - 312% = 3 guaranteed, 12% chance for 4th
 */
export function calculateOvercapYield(
  context: CraftingContext,
  recipeId: string,
  baseSuccessChance: number = BASE_CRAFT_SUCCESS_CHANCE
): CraftingYieldResult {
  const { playerId, tick, skills, playerLevel } = context;
  const recipe = craftingDirector.getRecipe(recipeId);
  
  if (!recipe) {
    return {
      success: false,
      baseAmount: 0,
      bonusChance: 0,
      bonusRoll: false,
      totalYield: 0,
      totalChance: 0,
      skillBonus: 0,
    };
  }

  // Determine skill based on recipe type
  const skillName = recipe.skill || 'carpentry';
  const skillLevel = (skills as Record<string, number>)[skillName] ?? 0;

  // Calculate total chance with skill bonus
  const skillBonus = Math.floor(skillLevel / SKILL_BONUS_PER_10_LEVELS);
  const totalChance = baseSuccessChance + skillBonus;

  // Overcap calculation
  const baseAmount = Math.floor(totalChance / 100);
  const bonusChance = (totalChance % 100) / 100;
  
  // Deterministic bonus roll
  const seed = `${playerId}:${tick}:craft_extra:${recipeId}:${skillLevel}`;
  const roll = deterministicRandom(seed);
  const bonusRoll = roll < bonusChance;

  const totalYield = baseAmount + (bonusRoll ? 1 : 0);
  const success = totalYield > 0;

  return {
    success,
    baseAmount,
    bonusChance,
    bonusRoll,
    totalYield,
    totalChance,
    skillBonus,
    xpGained: recipe.xpReward ? recipe.xpReward * totalYield : undefined,
  };
}

/**
 * Execute crafting with overcap multi-yield.
 * Consumes ingredients once, yields based on overcap calculation.
 */
export function executeOvercapCraft(
  context: CraftingContext,
  recipeId: string,
  npcInventory: NPCInventory
): NPCCraftResult {
  const { playerId, tick } = context;
  
  // Calculate yield first
  const yieldResult = calculateOvercapYield(context, recipeId);
  
  if (!yieldResult.success) {
    return craftingDirector.buildFailureResult(
      playerId,
      recipeId,
      tick,
      'CRAFT_FAILED_NO_YIELD'
    );
  }

  // Execute base craft (consume ingredients, get base amount)
  const baseResult = craftingDirector.craft(
    playerId,
    npcInventory,
    recipeId,
    tick
  );

  if (!baseResult.success) {
    return baseResult;
  }

  // Handle bonus yield (if bonus roll succeeded)
  if (yieldResult.bonusRoll && yieldResult.baseAmount === 0) {
    // Only had 1 guaranteed, got bonus for 2nd item
    // Add one more item to inventory
    const recipe = craftingDirector.getRecipe(recipeId);
    if (recipe && npcInventory.slots.length < npcInventory.maxSlots) {
      const bonusItem: ModularItem = {
        id: recipe.result.id,
        quantity: 1,
      };
      npcInventory.slots.push(bonusItem);
    }
  } else if (yieldResult.totalYield > yieldResult.baseAmount) {
    // Multiple bonus items
    const recipe = craftingDirector.getRecipe(recipeId);
    if (recipe) {
      const bonusCount = yieldResult.totalYield - yieldResult.baseAmount;
      const toAdd = Math.min(bonusCount, npcInventory.maxSlots - npcInventory.slots.filter(Boolean).length);
      for (let i = 0; i < toAdd; i++) {
        const bonusItem: ModularItem = {
          id: recipe.result.id,
          quantity: 1,
        };
        npcInventory.slots.push(bonusItem);
      }
    }
  }

  // Return enhanced result with yield info
  return {
    ...baseResult,
    kappaHash: baseResult.kappaHash + `:yield:${yieldResult.totalYield}`,
  };
}

export interface NPCCraftResult {
  success: boolean;
  npcId: string;
  recipeId: string;
  item?: { id: string };
  reason?: string;
  tick: number;
  kappaHash: string;
}

const DEFAULT_MAX_WEIGHT = 1000;

export class CraftingDirector {
  private static instance: CraftingDirector;
  private recipes: Map<string, CraftingRecipe> = new Map();
  
  // Recipe defaults with storage recipes for ARE system
  private readonly DEFAULT_RECIPES: CraftingRecipe[] = [
    {
      id: 'wooden_chest_craft',
      name: 'Wooden Chest',
      requiredLevel: 1,
      ingredients: [{ id: 'base:wood', amount: 5 }],
      result: { id: 'base:chest', amount: 1 },
      storageType: 'basic',
    },
    {
      id: 'iron_chest_craft',
      name: 'Iron Chest',
      requiredLevel: 3,
      ingredients: [
        { id: 'base:iron_bar', amount: 8 },
        { id: 'base:wood', amount: 3 },
      ],
      result: { id: 'base:iron_chest', amount: 1 },
      storageType: 'advanced',
    },
    {
      id: 'wooden_shield_craft',
      name: 'Wooden Shield',
      requiredLevel: 1,
      ingredients: [{ id: 'base:wood', amount: 3 }],
      result: { id: 'base:wooden_shield', amount: 1 },
    },
    {
      id: 'iron_sword_craft',
      name: 'Iron Sword',
      requiredLevel: 2,
      ingredients: [
        { id: 'base:iron_bar', amount: 2 },
        { id: 'base:wood', amount: 1 },
      ],
      result: { id: 'base:iron_sword', amount: 1 },
    },
    {
      id: 'basic_pickaxe_craft',
      name: 'Basic Pickaxe',
      requiredLevel: 1,
      ingredients: [
        { id: 'base:wood', amount: 2 },
        { id: 'base:stone', amount: 3 },
      ],
      result: { id: 'base:pickaxe', amount: 1 },
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

  /**
   * Register a crafting recipe deterministically.
   */
  public registerRecipe(recipe: CraftingRecipe): void {
    AREGuard.executeProtected(() => {
      if (!recipe.id || !recipe.result?.id) {
        throw new Error('[CraftingDirector] Invalid recipe: missing id or result');
      }
      this.recipes.set(recipe.id, recipe);
    });
  }

  /**
   * Get all registered recipes.
   */
  public getRecipes(): CraftingRecipe[] {
    return Array.from(this.recipes.values());
  }

  /**
   * Get recipe by ID.
   */
  public getRecipe(recipeId: string): CraftingRecipe | undefined {
    return this.recipes.get(recipeId);
  }

  /**
   * Check if NPC can craft a recipe (has sufficient ingredients).
   * Returns deterministic result without modifying state.
   */
  public canCraft(npcInventory: NPCInventory, recipeId: string): { possible: boolean; reason?: string } {
    return AREGuard.executeProtected(() => {
      const recipe = this.recipes.get(recipeId);
      if (!recipe) {
        return { possible: false, reason: 'RECIPE_NOT_FOUND' };
      }

      // Validate ingredients against NPC inventory
      for (const ing of recipe.ingredients) {
        let haveCount = 0;
        
        for (const slot of npcInventory.slots) {
          if (slot && slot.id === ing.id) {
            haveCount += slot.quantity ?? 1;
          }
        }

        if (haveCount < ing.amount) {
          return { possible: false, reason: `MISSING_INGREDIENT:${ing.id}` };
        }
      }

      return { possible: true };
    });
  }

  /**
   * Execute crafting for NPC.
   * Removes ingredients from NPC inventory, adds result item.
   * Returns deterministic result payload.
   */
  public craft(
    npcId: string,
    npcInventory: NPCInventory,
    recipeId: string,
    tick: number
  ): NPCCraftResult {
    return AREGuard.executeProtected(() => {
      const recipe = this.recipes.get(recipeId);
      if (!recipe) {
        return this.buildFailureResult(npcId, recipeId, tick, 'RECIPE_NOT_FOUND');
      }

      // ── Validate ingredients before mutation ──
      const ingredientValidation: { id: string; need: number; have: number }[] = [];
      let allValid = true;

      for (const ing of recipe.ingredients) {
        let haveCount = 0;
        for (const slot of npcInventory.slots) {
          if (slot && slot.id === ing.id) {
            haveCount += slot.quantity ?? 1;
          }
        }
        ingredientValidation.push({ id: ing.id, need: ing.amount, have: haveCount });
        if (haveCount < ing.amount) {
          allValid = false;
        }
      }

      if (!allValid) {
        return this.buildFailureResult(npcId, recipeId, tick, 'MISSING_INGREDIENTS');
      }

      // ── Atomic ingredient removal ──
      const slots = npcInventory.slots;
      for (const ing of recipe.ingredients) {
        let remaining = ing.amount;
        for (let i = 0; i < slots.length && remaining > 0; i++) {
          const slot = slots[i];
          if (!slot || slot.id !== ing.id) continue;

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

      // ── Add result item to NPC inventory ──
      const resultId = recipe.result.id;
      const resultQty = recipe.result.amount;
      const maxStack = ItemRegistry.maxStackFor(ItemRegistry.getItem(resultId));

      let toPlace = resultQty;
      while (toPlace > 0) {
        const n = Math.min(maxStack, toPlace);
        const instance = ItemRegistry.createInstance(resultId, n);
        if (instance) {
          slots.push(instance as ModularItem);
        } else {
          const item: ModularItem = { id: resultId, quantity: n };
          slots.push(item);
        }
        toPlace -= n;
      }

      normalizeInventoryStacks({ inventory: slots } as unknown as { inventory: (ModularItem | null)[] });

      // ── Generate deterministic kappa hash for audit trail ──
      const kappaHash = AREHash.hashObject({
        npcId,
        recipeId,
        tick,
        ingredients: ingredientValidation,
      }).toString(16);

      return {
        success: true,
        npcId,
        recipeId,
        item: { id: resultId },
        tick,
        kappaHash,
      };
    });
  }

  /**
   * Process NPC crafting intent directly.
   * Wrapper for intent handling.
   */
  public processIntent(intent: NPCCraftIntent, npcInventory: NPCInventory): NPCCraftResult {
    return this.craft(
      intent.npcId,
      npcInventory,
      intent.recipeId,
      intent.tick
    );
  }

  /**
   * Get all storage-type recipes (for chest/container crafting).
   */
  public getStorageRecipes(): CraftingRecipe[] {
    return this.getRecipes().filter(r => r.storageType && r.storageType !== 'none');
  }

  /**
   * Check if a recipe produces a storage item.
   */
  public isStorageRecipe(recipeId: string): boolean {
    const recipe = this.recipes.get(recipeId);
    return !!(recipe?.storageType && recipe.storageType !== 'none');
  }

  /**
   * Build deterministic failure result.
   */
  private buildFailureResult(
    npcId: string,
    recipeId: string,
    tick: number,
    reason: string
  ): NPCCraftResult {
    const kappaHash = AREHash.hashObject({
      npcId,
      recipeId,
      tick,
      failure: true,
      reason,
    }).toString(16);

    return {
      success: false,
      npcId,
      recipeId,
      reason,
      tick,
      kappaHash,
    };
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────

export const craftingDirector = CraftingDirector.getInstance();
