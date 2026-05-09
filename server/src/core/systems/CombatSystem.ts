/**
 * @file server/src/core/systems/CombatSystem.ts
 * @description STEP 9: Combat & Loot System with LootResolver.
 */

import { type RegionState, KAPPA } from '../state/RegionState.js';
import { worldStateRegistry } from '../state/WorldStateRegistry.js';

export interface CombatResult {
  attackerId: string;
  targetId: string;
  hit: boolean;
  damage: number; // Fixed-Point
}

export interface LootDrop {
  itemType: string;
  itemId: string;
  value: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

/**
 * Fixed-Point helpers
 */
function toFP(value: number): number {
  return Math.floor(value * KAPPA);
}

function fromFP(fp: number): number {
  return fp / KAPPA;
}

/**
 * CombatSystem - Server-side combat validation
 */
export class CombatSystem {
  /**
   * Validate and process attack
   */
  public validateAttack(
    attackerPos: { x: number; y: number; z: number },
    targetPos: { x: number; y: number; z: number },
    range: number
  ): boolean {
    return this.calculateDistance(attackerPos, targetPos) <= toFP(range);
  }
  
  /**
   * Calculate distance in Fixed-Point (k=1000)
   */
  private calculateDistance(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number }
  ): number {
    const dx = (a.x - b.x) * KAPPA;
    const dy = (a.y - b.y) * KAPPA;
    const dz = (a.z - b.z) * KAPPA;
    return Math.floor(Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  
  /**
   * Process hit and calculate damage
   */
  public calculateDamage(
    baseDamage: number,
    region: RegionState,
    playerMastery: number
  ): number {
    // Apply region threat multiplier
    const threatMult = 1 + fromFP(region.threatLevel) * 0.5;
    // Apply mastery multiplier
    const masteryMult = 1 + fromFP(playerMastery) * 0.2;
    
    return Math.floor(baseDamage * threatMult * masteryMult);
  }
}