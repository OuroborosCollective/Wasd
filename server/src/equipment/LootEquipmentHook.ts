/**
 * LOOT EQUIPMENT HOOK
 *
 * Integrates equipment stats into loot generation.
 * Server-authoritative: magicFind and lootQuality from equipment affect loot rolls.
 *
 * Rules:
 * - No Math.random() for stat calculations
 * - No Date.now() for gameplay state
 * - Deterministic: stats come from server-side equipment state only
 * - Same equipment + same event = same result (deterministic replay)
 */

import type { EquipmentStatBlock } from "./EquipmentStatTypes.js";

/**
 * Input for loot equipment calculations.
 */
export interface LootEquipmentInput {
  /** Equipment stat block from EquipmentStatService */
  equipmentStats: EquipmentStatBlock;
  /** Base magic find from character/progression (e.g., from quests) */
  baseMagicFind?: number;
  /** Base loot quality from character/progression */
  baseLootQuality?: number;
}

/**
 * Output of loot equipment calculations.
 */
export interface LootEquipmentOutput {
  /** Total effective magic find for rarity rolls */
  effectiveMagicFind: number;
  /** Total effective loot quality for affix quality */
  effectiveLootQuality: number;
}

/**
 * Calculate loot-relevant stats from equipment.
 * Used by loot generation to incorporate equipment bonuses.
 *
 * @param input - Equipment stats and base values
 * @returns Effective magic find and loot quality
 */
export function calculateLootEquipmentStats(input: LootEquipmentInput): LootEquipmentOutput {
  const { equipmentStats, baseMagicFind = 0, baseLootQuality = 0 } = input;

  // Magic find caps at 300 (from EQUIPMENT_STAT_CAPS)
  // Loot quality caps at 300
  const effectiveMagicFind = Math.max(
    0,
    Math.min(300, baseMagicFind + equipmentStats.magicFind)
  );
  const effectiveLootQuality = Math.max(
    0,
    Math.min(300, baseLootQuality + equipmentStats.lootQuality)
  );

  return Object.freeze({
    effectiveMagicFind,
    effectiveLootQuality,
  });
}

/**
 * Context extension for loot generation that includes equipment stats.
 * This is passed to ProceduralLootMachine.generate() via LootContext.
 */
export interface LootContextWithEquipment {
  /** Standard loot context fields */
  playerId: string;
  tickIndex: number;
  dropSourceId: string;
  lootIndex?: number;
  areaLevel: number;
  policyVersion?: string;
  treasureClassId?: string;
  killStreak?: number;
  sourceRank?: string;
  biomeId?: string;
  factionId?: string;
  socialString?: string;
  playerReputation?: number;
  /** Equipment-derived magic find */
  magicFind: number;
  /** Equipment-derived loot quality (for future affix quality scaling) */
  lootQuality: number;
}

/**
 * Extend a standard loot context with equipment stats.
 * Used when calling loot generation from combat/gathering events.
 */
export function extendLootContextWithEquipment(
  baseContext: Omit<LootContextWithEquipment, "magicFind" | "lootQuality">,
  equipmentStats: EquipmentStatBlock,
  baseMagicFind = 0,
  baseLootQuality = 0,
): LootContextWithEquipment {
  const { effectiveMagicFind, effectiveLootQuality } = calculateLootEquipmentStats({
    equipmentStats,
    baseMagicFind,
    baseLootQuality,
  });

  return {
    ...baseContext,
    magicFind: effectiveMagicFind,
    lootQuality: effectiveLootQuality,
  };
}