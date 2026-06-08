/**
 * COMBAT EQUIPMENT HOOK
 *
 * Integrates equipment stats into combat calculations.
 * Server-authoritative: attack_power adds to damage, defense reduces incoming damage.
 *
 * Rules:
 * - No Math.random() for stat calculations
 * - No Date.now() for gameplay state
 * - Deterministic: stats come from server-side equipment state only
 */

import type { EquipmentStatBlock } from "./EquipmentStatTypes.js";

/**
 * Input for combat equipment calculations.
 */
export interface CombatEquipmentInput {
  /** Equipment stat block from EquipmentStatService */
  equipmentStats: EquipmentStatBlock;
  /** Base attack stat from attacker (e.g., combat skill level) */
  baseAttack: number;
  /** Base defense stat from defender */
  baseDefense: number;
}

/**
 * Output of combat equipment calculations.
 */
export interface CombatEquipmentOutput {
  /** Total attack power including equipment bonus */
  totalAttackPower: number;
  /** Total defense including equipment bonus */
  totalDefense: number;
  /** Critical chance per mille (0-250) */
  critChancePerMille: number;
}

/**
 * Calculate combat-relevant stats from equipment.
 * Used by CombatSystem to incorporate equipment bonuses.
 */
export function calculateCombatEquipmentStats(input: CombatEquipmentInput): CombatEquipmentOutput {
  const { equipmentStats, baseAttack, baseDefense } = input;

  return Object.freeze({
    totalAttackPower: baseAttack + equipmentStats.attackPower,
    totalDefense: baseDefense + equipmentStats.defense,
    critChancePerMille: equipmentStats.criticalChancePerMille,
  });
}

/**
 * Apply defense to reduce incoming damage.
 * Returns the final damage after defense mitigation.
 *
 * @param rawDamage - Raw damage before defense
 * @param defense - Total defense value
 * @param minDamage - Minimum damage to always deal (default: 1)
 * @returns Final damage after defense reduction
 */
export function applyDefense(rawDamage: number, defense: number, minDamage = 1): number {
  const mitigated = rawDamage - defense;
  return Math.max(minDamage, mitigated);
}

/**
 * Calculate critical hit chance as a decimal (0-1).
 * Input is per-mille (0-250), output is decimal probability.
 */
export function critChancePermilleToDecimal(critPerMille: number): number {
  return Math.max(0, Math.min(250, critPerMille)) / 1000;
}

/**
 * Determine if a critical hit occurs based on equipment crit chance.
 * Uses a deterministic check against the RNG.
 *
 * Note: The actual RNG call should happen in CombatSystem.
 * This function just validates and converts the stat.
 */
export function shouldCrit(critPerMille: number, rngValue: number): boolean {
  const threshold = critChancePermilleToDecimal(critPerMille);
  return rngValue < threshold;
}

/**
 * Calculate final damage with all equipment bonuses.
 * Combines base damage, attack power, and applies defense.
 */
export function calculateFinalDamage(params: {
  baseDamage: number;
  attackPower: number;
  defense: number;
  rngValue: number;
  critChancePerMille: number;
  critMultiplier?: number;
  minDamage?: number;
}): {
  damage: number;
  isCrit: boolean;
} {
  const {
    baseDamage,
    attackPower,
    defense,
    rngValue,
    critChancePerMille,
    critMultiplier = 1.75,
    minDamage = 1,
  } = params;

  const totalDamage = baseDamage + attackPower;
  const isCrit = shouldCrit(critChancePerMille, rngValue);
  const rawDamage = isCrit ? Math.floor(totalDamage * critMultiplier) : totalDamage;
  const finalDamage = applyDefense(rawDamage, defense, minDamage);

  return { damage: finalDamage, isCrit };
}