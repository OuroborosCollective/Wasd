/**
 * GATHERING EQUIPMENT HOOK
 *
 * Integrates equipment stats into gathering calculations.
 * Server-authoritative: gathering_yield and gathering_xp from equipment affect yields.
 *
 * Rules:
 * - No Math.random() for stat calculations
 * - No Date.now() for gameplay state
 * - Deterministic: stats come from server-side equipment state only
 * - Tier 2 tool bonus preserved
 * - Cap total bonus yield at 5
 */

import type { EquipmentStatBlock } from "./EquipmentStatTypes.js";

/**
 * Input for gathering equipment calculations.
 */
export interface GatheringEquipmentInput {
  /** Equipment stat block from EquipmentStatService */
  equipmentStats: EquipmentStatBlock;
  /** Tool tier bonus (1 for tier 1, 2 for tier 2) */
  toolTierBonus: number;
  /** Base XP multiplier permille from tool (e.g., 1100 for tier 1) */
  toolXpMultiplierPermille: number;
}

/**
 * Output of gathering equipment calculations.
 */
export interface GatheringEquipmentOutput {
  /** Total gathering yield bonus (tool + equipment), capped at 5 */
  totalYieldBonus: number;
  /** Total XP multiplier permille (tool * equipment compound) */
  totalXpMultiplierPermille: number;
}

/**
 * Cap for total gathering yield bonus.
 * Maximum bonus yield from all sources combined.
 */
export const GATHERING_YIELD_CAP = 5;

/**
 * Calculate gathering-relevant stats from equipment.
 * Combines tool tier bonus with equipment gathering yield stat.
 *
 * @param input - Equipment stats and tool bonuses
 * @returns Total yield bonus and XP multiplier
 */
export function calculateGatheringEquipmentStats(input: GatheringEquipmentInput): GatheringEquipmentOutput {
  const { equipmentStats, toolTierBonus, toolXpMultiplierPermille } = input;

  // Calculate total yield bonus (tool tier - 1 gives +1 for tier 2)
  // Plus equipment gathering_yield stat
  const toolYieldBonus = Math.max(0, toolTierBonus - 1); // Tier 1 = 0, Tier 2 = 1
  const equipmentYieldBonus = Math.max(0, equipmentStats.gatheringYield);
  const totalYieldBonus = Math.min(
    GATHERING_YIELD_CAP,
    toolYieldBonus + equipmentYieldBonus
  );

  // Calculate XP multiplier (tool base * equipment bonus)
  // equipmentStats.gatheringXp is per-mille, so 1000 = no change
  const equipmentXpMultiplier = Math.max(1000, equipmentStats.gatheringXp + 1000);
  const totalXpMultiplierPermille = Math.floor(
    (toolXpMultiplierPermille * equipmentXpMultiplier) / 1000
  );

  return Object.freeze({
    totalYieldBonus,
    totalXpMultiplierPermille,
  });
}

/**
 * Calculate final yield quantity from base and bonuses.
 *
 * @param baseYield - Base yield (usually 1)
 * @param totalYieldBonus - Total yield bonus from equipment
 * @returns Final yield quantity
 */
export function calculateFinalYield(baseYield: number, totalYieldBonus: number): number {
  return Math.max(1, baseYield + totalYieldBonus);
}