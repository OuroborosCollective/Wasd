/**
 * @file server/src/core/systems/CMLS.ts
 * @description STEP 9: Combat, Movement & Loot System.
 * Server-authoritative with deterministic calculations.
 */

import { type RegionState, KAPPA, OraclePressureTag } from '../state/RegionState.js';
import { worldStateRegistry, type PendingMutation } from '../state/WorldStateRegistry.js';

/**
 * Fixed-Point constant
 */
const FP_SCALE = 1000;

/**
 * Convert to Fixed-Point
 */
function toFP(value: number): number {
  return Math.floor(value * FP_SCALE);
}

/**
 * Convert from Fixed-Point
 */
function fromFP(fp: number): number {
  return fp / FP_SCALE;
}

/**
 * Position vector
 */
interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Combat result
 */
export interface CombatResult {
  attackerId: string;
  targetId: string;
  hit: boolean;
  damage: number; // Fixed-Point
  critical: boolean;
}

/**
 * Loot drop
 */
export interface LootDrop {
  itemType: string;
  itemId: string;
  amount: number;
  value: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

/**
 * Movement correction
 */
export interface MovementCorrection {
  targetId: string;
  correctPosition: Position3D;
  reason: 'TELEPORT' | 'SPEED_HACK' | 'WALL_HACK';
}

/**
 * Loot table entry (dynamic, not static)
 */
interface LootEntry {
  itemType: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

/**
 * Alternative loot pools based on region state
 */
const DEPLETED_POOL: LootEntry[] = [
  { itemType: 'industrial_scrap', rarity: 'common' },
  { itemType: 'alternative_energy_cell', rarity: 'uncommon' },
  { itemType: 'recycled_metal', rarity: 'rare' },
];

const NORMAL_POOL: LootEntry[] = [
  { itemType: 'wood', rarity: 'common' },
  { itemType: 'stone', rarity: 'common' },
  { itemType: 'herb', rarity: 'uncommon' },
  { itemType: 'ore', rarity: 'uncommon' },
  { itemType: 'crystal', rarity: 'rare' },
  { itemType: 'ancient_artifact', rarity: 'epic' },
];

const HIGH_CONFLICT_POOL: LootEntry[] = [
  { itemType: 'combat_supplies', rarity: 'common' },
  { itemType: 'military_tech', rarity: 'uncommon' },
  { itemType: 'war_plans', rarity: 'rare' },
  { itemType: 'legacy_weapon', rarity: 'legendary' },
];

/**
 * Maximum movement per tick (10 units = 10,000 FP)
 */
const MAX_MOVEMENT_PER_TICK = toFP(10);

/**
 * Anti-rubberbanding thresholds
 */
const SOFT_SYNC_THRESHOLD = toFP(2); // 2 units - interpolate
const HARD_SYNC_THRESHOLD = toFP(5); // 5 units - hard correction
const MAX_INTERPOLATION_DISTANCE = toFP(8); // 8 units max interpolate

/**
 * CMLS - Combat, Movement & Loot System
 */
export class CMLS {
  private pendingCorrections: MovementCorrection[] = [];
  private conflictImpulses: PendingMutation[] = [];

  /**
   * 1. Server-Authoritative Movement
   * Validates and corrects movement vectors
   */
  public validateMovement(
    playerId: string,
    lastPosition: Position3D,
    newPosition: Position3D,
    timestamp: bigint
  ): MovementCorrection | null {
    // Calculate actual distance
    const distance = this.calculateDistance(lastPosition, newPosition);

    // Check for teleportation (hard violation)
    if (distance > HARD_SYNC_THRESHOLD) {
      return {
        targetId: playerId,
        correctPosition: lastPosition,
        reason: 'TELEPORT',
      };
    }

    // Check for speed hack
    if (distance > MAX_MOVEMENT_PER_TICK) {
      return {
        targetId: playerId,
        correctPosition: this.clampPosition(lastPosition, newPosition, MAX_MOVEMENT_PER_TICK),
        reason: 'SPEED_HACK',
      };
    }

    // Soft sync - interpolate (small desync)
    if (distance > SOFT_SYNC_THRESHOLD) {
      // Just log, don't correction
      // Could implement client-side interpolation here
    }

    return null;
  }

  /**
   * Apply anti-rubberbanding interpolation
   */
  public interpolatePosition(
    from: Position3D,
    to: Position3D,
    factor: number // 0-1 Fixed-Point
  ): Position3D {
    const distance = this.calculateDistance(from, to);
    
    // Only interpolate if within threshold
    if (distance > MAX_INTERPOLATION_DISTANCE) {
      return to;
    }

    return {
      x: Math.floor(from.x + (to.x - from.x) * factor),
      y: Math.floor(from.y + (to.y - from.y) * factor),
      z: Math.floor(from.z + (to.z - from.z) * factor),
    };
  }

  /**
   * 2. Deterministic Combat
   * Calculate hits and damage purely on server
   */
  public processAttack(
    attackerId: string,
    targetId: string,
    attackerPos: Position3D,
    targetPos: Position3D,
    baseDamage: number,
    region: RegionState,
    playerMastery: number,
    weaponCriticalChance: number = toFP(0.1)
  ): CombatResult {
    // Check range (hitscan logic)
    const range = this.calculateDistance(attackerPos, targetPos);
    const maxRange = toFP(50); // 50 unit weapon range

    if (range > maxRange) {
      return { attackerId, targetId, hit: false, damage: 0, critical: false };
    }

    // Hit confirmed - calculate critical
    const critical = Math.floor(Math.random() * FP_SCALE) < weaponCriticalChance;

    // Calculate damage: Base_DMG * (1 + Mastery_Bonus / 1000) * (Critical_Mod)
    let masteryBonus = Math.floor(playerMastery * 0.2);
    let criticalMod = critical ? toFP(2.0) : FP_SCALE;
    
    const threatMult = FP_SCALE + Math.floor(region.threatLevel * 0.5);
    
    // Full formula in Fixed-Point
    let damage = Math.floor(
      (baseDamage * (FP_SCALE + masteryBonus) * threatMult * criticalMod) /
      (FP_SCALE * FP_SCALE * FP_SCALE)
    );

    // Ensure minimum damage
    damage = Math.max(1, damage);

    return { attackerId, targetId, hit: true, damage, critical };
  }

  /**
   * 3. Context-Sensitive LootResolver
   * No static tables - dynamic based on region state
   */
  public resolveLoot(
    combat: CombatResult,
    region: RegionState,
    victimValue: number
  ): LootDrop[] {
    if (!combat.hit || combat.damage <= 0) {
      return [];
    }

    const drops: LootDrop[] = [];

    // Determine loot pool based on region state
    let pool = this.selectLootPool(region);

    // Calculate drop quality
    const quality = this.calculateLootQuality(region);

    // Roll for each item in pool
    for (const entry of pool) {
      const roll = Math.floor(Math.random() * FP_SCALE);
      
      // Check if item drops
      if (roll < quality) {
        const amount = this.rollAmount(entry.rarity);
        const value = this.calculateItemValue(entry.rarity, combat, victimValue);

        drops.push({
          itemType: entry.itemType,
          itemId: `${entry.itemType}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          amount,
          value,
          rarity: entry.rarity,
        });
      }
    }

    return drops;
  }

  /**
   * Select loot pool based on region state
   */
  private selectLootPool(region: RegionState): LootEntry[] {
    // If DEPLETED_RESOURCES, use depleted pool
    if (region.oraclePressureTags.includes('DEPLETED_RESOURCES' as OraclePressureTag)) {
      return DEPLETED_POOL;
    }

    // If HIGH_CONFLICT, use combat pool
    if (region.oraclePressureTags.includes('HIGH_CONFLICT' as OraclePressureTag) || region.threatLevel > toFP(0.7)) {
      return HIGH_CONFLICT_POOL;
    }

    // Default to normal pool
    return NORMAL_POOL;
  }

  /**
   * Calculate loot drop quality
   * Formula: Base_Chance * (1 + Region_Plexity_Level) * (1 + Oracle_Pressure_Tag_Bonus)
   */
  private calculateLootQuality(region: RegionState): number {
    const baseChance = toFP(0.3); // 30% base

    // Region Plexity Level factor (assume stored in region)
    const plexityLevel = 0; // Would come from region.plexityLevel

    // Oracle pressure bonus
    let oracleBonus = 0;
    if (region.oraclePressureTags.includes('ECONOMIC_BOOM' as OraclePressureTag)) {
      oracleBonus += toFP(0.5);
    }
    if (region.oraclePressureTags.includes('RESOURCE_SURGE' as OraclePressureTag)) {
      oracleBonus += toFP(0.3);
    }

    // Full formula: baseChance * (1 + plexityLevel) * (1 + oracleBonus)
    const quality = Math.floor(
      (baseChance * (FP_SCALE + plexityLevel) * (FP_SCALE + oracleBonus)) /
      (FP_SCALE * FP_SCALE)
    );

    return Math.min(FP_SCALE, quality);
  }

  /**
   * Roll amount based on rarity
   */
  private rollAmount(rarity: string): number {
    switch (rarity) {
      case 'common': return 1 + Math.floor(Math.random() * 3);
      case 'uncommon': return 1 + Math.floor(Math.random() * 2);
      case 'rare': return 1;
      case 'epic': return 1;
      case 'legendary': return 1;
      default: return 1;
    }
  }

  /**
   * Calculate item value based on rarity and combat
   */
  private calculateItemValue(rarity: string, combat: CombatResult, victimValue: number): number {
    let baseValue = victimValue;

    // Rarity multiplier
    const rarityMult: Record<string, number> = {
      'common': 1,
      'uncommon': 2,
      'rare': 5,
      'epic': 10,
      'legendary': 25,
    };

    // Combat bonus (critical hits = more value)
    const combatBonus = combat.critical ? toFP(1.5) : FP_SCALE;

    const value = Math.floor(
      (baseValue * (rarityMult[rarity] || 1) * combatBonus / FP_SCALE
    );

    return value;
  }

  /**
   * 4. State Update
   * Send conflict pressure impulses to Oracle
   */
  public registerKill(
    killerId: string,
    victimId: string,
    regionId: string,
    region: RegionState
  ): void {
    // Increase conflict based on victim's threat level
    const conflictBoost = Math.floor(region.threatLevel / 4);

    this.conflictImpulses.push({
      type: 'SET_REGION_FIELD',
      regionId,
      field: 'threatLevel',
      value: Math.min(KAPPA, region.threatLevel + conflictBoost + toFP(0.05)),
    });

    // If high threat killed, reduce overall conflict
    if (region.threatLevel > toFP(0.8)) {
      this.conflictImpulses.push({
        type: 'SET_REGION_FIELD',
        regionId,
        field: 'threatLevel',
        value: Math.max(0, region.threatLevel - toFP(0.1)),
      });
    }
  }

  /**
   * Apply all pending impulses
   */
  public applyImpulses(): void {
    for (const impulse of this.conflictImpulses) {
      worldStateRegistry.queueMutation(impulse);
    }
    this.conflictImpulses = [];
  }

  /**
   * Calculate distance in Fixed-Point
   */
  private calculateDistance(a: Position3D, b: Position3D): number {
    const dx = (a.x - b.x) * FP_SCALE;
    const dy = (a.y - b.y) * FP_SCALE;
    const dz = (a.z - b.z) * FP_SCALE;
    return Math.floor(Math.sqrt(dx * dx + dy * dy + dz * dz));
  }

  /**
   * Clamp position to max distance
   */
  private clampPosition(
    from: Position3D,
    to: Position3D,
    maxDist: number
  ): Position3D {
    const dist = this.calculateDistance(from, to);
    if (dist <= maxDist) return to;

    const ratio = maxDist / dist;
    return {
      x: Math.floor(from.x + (to.x - from.x) * ratio),
      y: Math.floor(from.y + (to.y - from.y) * ratio),
      z: Math.floor(from.z + (to.z - from.z) * ratio),
    };
  }

  /**
   * Get pending corrections
   */
  public getCorrections(): MovementCorrection[] {
    return [...this.pendingCorrections];
  }

  /**
   * Clear corrections
   */
  public clearCorrections(): void {
    this.pendingCorrections = [];
  }
}

/**
 * Singleton
 */
export const cmls = new CMLS();