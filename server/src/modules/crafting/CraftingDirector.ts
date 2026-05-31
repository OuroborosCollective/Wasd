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
 * This director is the server-authoritative handler for NPC crafting
 * intents. It validates ingredients against NPC inventory, executes
 * crafting, and returns deterministic results.
 */

import { AREGuard } from '../../core/are/AREGuard.js';
import { AREHash } from '../../core/are/AREHash.js';
import { ItemRegistry } from '../inventory/ItemRegistry.js';
import { normalizeInventoryStacks } from '../inventory/inventoryStacks.js';

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

export interface NPCCraftIntent {
  npcId: string;
  recipeId: string;
  tick: number;
  kappaHash?: string;
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
      const kappaHash = AREHash.generate({
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
    const kappaHash = AREHash.generate({
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
