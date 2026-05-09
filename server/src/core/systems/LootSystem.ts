/**
 * @file server/src/core/systems/LootSystem.ts
 * @description STEP 9b: Loot System with LootResolver.
 */

import { type RegionState, KAPPA } from '../state/RegionState.js';
import { type CombatResult } from './CombatSystem.js';

/**
 * Loot drop with base rates
 */
export interface LootTableEntry {
  itemType: string;
  baseDropRate: number; // Fixed-Point (0-1000)
  minAmount: number;
  maxAmount: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

/**
 * LootResolver - Calculates drops based on region state and player
 */
export class LootSystem {
  private lootTable: LootTableEntry[] = [];
  
  /**
   * Resolve loot drop for combat result
   */
  public resolveLoot(
    combat: CombatResult,
    region: RegionState,
    itemValue: number,
    mastery: number
  ): LootDrop[] {
    if (!combat.hit) return [];
    
    const drops: LootDrop[] = [];
    
    for (const entry of this.lootTable) {
      // Base roll
      let roll = Math.floor(Math.random() * KAPPA);
      
      // Modify by region saturation (higher = less drops)
      const satMod = fromFP(region.resourceSaturation.get(entry.itemType) ?? KAPPA);
      roll = Math.floor(roll * (1 - satMod / KAPPA * 0.5));
      
      // Modify by mastery
      roll = Math.floor(roll * (1 + fromFP(mastery) * 0.3));
      
      // Check threshold
      if (roll < fromFP(entry.baseDropRate)) {
        // Roll amount
        const amount = entry.minAmount + Math.floor(
          Math.random() * (entry.maxAmount - entry.minAmount)
        );
        
        drops.push({
          itemType: entry.itemType,
          itemId: `${entry.itemType}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          value: itemValue,
          rarity: entry.rarity,
        });
      }
    }
    
    return drops;
  }
  
  /**
   * Register loot table entry
   */
  public registerLoot(entry: LootTableEntry): void {
    this.lootTable.push(entry);
  }
}

function fromFP(fp: number): number {
  return fp / KAPPA;
}