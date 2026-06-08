/**
 * AFFIX TO STAT MAPPING
 *
 * Maps procedural loot affix stat names to equipment stat keys.
 * This is the bridge between the loot system and equipment bonuses.
 *
 * Deterministic: No Math.random(), no Date.now().
 * Only allowlisted stats are accepted; unknown stats fail closed.
 */

import type { EquipmentStatKey } from "./EquipmentStatTypes.js";
import { isEquipmentStatKey, capStatValue } from "./EquipmentStatTypes.js";

/**
 * Mapping from affix stat names to equipment stat keys.
 * Unknown/unmapped stats are silently ignored by the mapping functions.
 */
const AFFIX_STAT_TO_EQUIPMENT_STAT: Readonly<Record<string, EquipmentStatKey>> = Object.freeze({
  // Attack power
  damage: "attack_power",
  damageMax: "attack_power",
  damageMin: "attack_power",
  attack_power: "attack_power",
  attackPower: "attack_power",

  // Defense
  armor: "defense",
  defense: "defense",
  physical_resistance: "defense",

  // Health
  vitality: "max_health",
  max_health: "max_health",
  maxHealth: "max_health",
  health: "max_health",
  hp: "max_health",

  // Stamina
  stamina: "max_stamina",
  max_stamina: "max_stamina",
  maxStamina: "max_stamina",
  endurance: "max_stamina",

  // Magic Find
  magic_find: "magic_find",
  magicFind: "magic_find",
  mf: "magic_find",
  magic_find_permille: "magic_find",

  // Gathering Yield
  gathering_yield: "gathering_yield",
  gatheringYield: "gathering_yield",
  yield: "gathering_yield",
  gather_yield: "gathering_yield",

  // Gathering XP
  gathering_xp: "gathering_xp",
  gatheringXp: "gathering_xp",
  xp_bonus: "gathering_xp",
  xpMultiplier: "gathering_xp",

  // Loot Quality
  loot_quality: "loot_quality",
  lootQuality: "loot_quality",
  item_quality: "loot_quality",
  quality: "loot_quality",

  // Critical Chance
  critical_chance_per_mille: "critical_chance_per_mille",
  criticalChancePerMille: "critical_chance_per_mille",
  crit_chance: "critical_chance_per_mille",
  crit_permille: "critical_chance_per_mille",
});

/**
 * Result of mapping an affix to equipment stats.
 */
export interface AffixStatMappingResult {
  statKey: EquipmentStatKey;
  cappedValue: number;
}

/**
 * Map an affix object (with stat and value) to equipment stat key and capped value.
 * Returns null if the stat is not in the allowlist.
 *
 * @param affix - Affix object with stat (string) and value (number)
 * @returns Mapped result with capped value, or null if not mappable
 */
export function mapAffixToEquipmentStat(
  affix: { stat: string; value: number },
): AffixStatMappingResult | null {
  const statKey = AFFIX_STAT_TO_EQUIPMENT_STAT[affix.stat];
  if (!statKey) {
    return null;
  }
  const cappedValue = capStatValue(statKey, affix.value);
  return { statKey, cappedValue };
}

/**
 * Map multiple affixes to equipment stats.
 * Unknown or unmapped affixes are silently skipped.
 *
 * @param affixes - Array of affix objects with stat and value
 * @returns Array of mapped results with capped values
 */
export function mapAffixesToEquipmentStats(
  affixes: ReadonlyArray<{ stat: string; value: number }>,
): AffixStatMappingResult[] {
  const results: AffixStatMappingResult[] = [];
  for (const affix of affixes) {
    const mapped = mapAffixToEquipmentStat(affix);
    if (mapped !== null) {
      results.push(mapped);
    }
  }
  return results;
}

/**
 * Check if a stat name can be mapped to an equipment stat key.
 * Useful for validation/debugging.
 */
export function canMapAffixStat(stat: string): boolean {
  return stat in AFFIX_STAT_TO_EQUIPMENT_STAT;
}

/**
 * Get the equipment stat key for an affix stat name.
 * Returns undefined if not mappable.
 */
export function getEquipmentStatKeyForAffixStat(stat: string): EquipmentStatKey | undefined {
  return AFFIX_STAT_TO_EQUIPMENT_STAT[stat];
}

/**
 * Validate that an item's attributes only contain known equipment stats.
 * Used by LootGovernor to sanitize items with unknown stats.
 *
 * @param attributes - Item attributes object
 * @returns Array of unknown stat keys (empty if all known)
 */
export function findUnknownStatsInAttributes(
  attributes: Record<string, unknown>,
): string[] {
  const unknown: string[] = [];
  for (const key of Object.keys(attributes)) {
    if (!isEquipmentStatKey(key) && !AFFIX_STAT_TO_EQUIPMENT_STAT[key]) {
      unknown.push(key);
    }
  }
  return unknown;
}