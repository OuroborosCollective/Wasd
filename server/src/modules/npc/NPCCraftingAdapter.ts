/**
 * OUROBOROS SYSTEMIC EMERGENCE: NPC Crafting Adapter
 * 
 * Wires NPCSystem thinking to CraftingDirector execution.
 * When ARENpcEvolution brain decides CRAFT_CHEST, this adapter
 * creates the crafting intent and executes it.
 * 
 * Conservation Axiom: NPCs send exact same crafting intents as players.
 * No special treatment, no phantom crafting.
 */

import { AREGuard } from '../../core/are/AREGuard.js';
import { ARENpcEvolution } from '../../core/are/ARENpcEvolution.js';
import { craftingDirector, type NPCCraftResult } from '../crafting/CraftingDirector.js';
import { npcInventoryManager } from './NPCInventoryManager.js';

export interface NPCCraftingIntent {
  npcId: string;
  selectedAction: string;
  recipeId: string;
  targetEntity?: string;
}

export interface CraftingExecutionResult {
  success: boolean;
  npcId: string;
  action: string;
  craftResult?: NPCCraftResult;
  itemCreated?: boolean;
  reason?: string;
  tick: number;
}

/**
 * NPCCraftingAdapter
 * 
 * This is the bridge between NPC decision-making and server-side crafting.
 * It receives crafting decisions from ARENpcEvolution and executes them
 * through the CraftingDirector using the NPC's real inventory.
 */
export class NPCCraftingAdapter {
  private static instance: NPCCraftingAdapter;

  private constructor() {}

  public static getInstance(): NPCCraftingAdapter {
    if (!NPCCraftingAdapter.instance) {
      NPCCraftingAdapter.instance = new NPCCraftingAdapter();
    }
    return NPCCraftingAdapter.instance;
  }

  /**
   * Execute crafting action for NPC.
   * Validates ingredients, executes craft, updates NPC inventory.
   */
  public executeCrafting(
    npcId: string,
    recipeId: string,
    tick: number
  ): CraftingExecutionResult {
    return AREGuard.executeProtected(() => {
      // Get NPC inventory
      const inventory = npcInventoryManager.getInventory(npcId);
      if (!inventory) {
        return {
          success: false,
          npcId,
          action: 'CRAFT',
          reason: 'NPC_INVENTORY_NOT_FOUND',
          tick,
        };
      }

      // Convert NPCInventoryState to format expected by CraftingDirector
      // This follows Conservation Axiom - NPCs use same inventory format
      const npcInventory = {
        slots: inventory.slots,
        maxSlots: inventory.maxSlots,
      };

      // First check if can craft (validation without mutation)
      const canCraftResult = craftingDirector.canCraft(npcInventory, recipeId);
      if (!canCraftResult.possible) {
        return {
          success: false,
          npcId,
          action: 'CRAFT',
          reason: canCraftResult.reason,
          tick,
        };
      }

      // Execute the crafting (this mutates actual inventory)
      const craftResult = craftingDirector.craft(npcId, npcInventory, recipeId, tick);

      if (craftResult.success) {
        // Update NPC inventory manager with modified slots
        inventory.slots = npcInventory.slots;
        
        return {
          success: true,
          npcId,
          action: 'CRAFT',
          craftResult,
          itemCreated: true,
          tick,
        };
      }

      return {
        success: false,
        npcId,
        action: 'CRAFT',
        reason: craftResult.reason,
        tick,
      };
    });
  }

  /**
   * Process utility intelligence decision from ARENpcEvolution.
   * Main entry point for NPCSystem integration.
   */
  public processUtilityDecision(
    npcId: string,
    selectedAction: string,
    targetEntity: string | undefined,
    tick: number
  ): CraftingExecutionResult {
    return AREGuard.executeProtected(() => {
      switch (selectedAction) {
        case 'CRAFT_WOODEN_CHEST':
          return this.executeCrafting(npcId, 'wooden_chest_craft', tick);

        case 'CRAFT_IRON_CHEST':
          return this.executeCrafting(npcId, 'iron_chest_craft', tick);

        case 'CRAFT_EQUIPMENT':
          // For equipment, we'd need more context about what to craft
          return {
            success: false,
            npcId,
            action: selectedAction,
            reason: 'CRAFT_EQUIPMENT_REQUIRES_CONTEXT',
            tick,
          };

        default:
          // Not a crafting action, just record the decision
          return {
            success: true,
            npcId,
            action: selectedAction,
            tick,
          };
      }
    });
  }

  /**
   * Clear NPC crafting state (on decomposition).
   */
  public onNPCCleanup(npcId: string): void {
    npcInventoryManager.clearInventory(npcId);
  }

  /**
   * Get crafting recipes available to NPC.
   */
  public getAvailableRecipes(npcId: string): { id: string; name: string; canCraft: boolean }[] {
    const inventory = npcInventoryManager.getInventory(npcId);
    if (!inventory) return [];

    const npcInventory = {
      slots: inventory.slots,
      maxSlots: inventory.maxSlots,
    };

    const recipes = craftingDirector.getRecipes();
    return recipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      canCraft: craftingDirector.canCraft(npcInventory, recipe.id).possible,
    }));
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────

export const npcCraftingAdapter = NPCCraftingAdapter.getInstance();
