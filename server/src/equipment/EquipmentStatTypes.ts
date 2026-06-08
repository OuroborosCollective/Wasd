/**
 * EQUIPMENT STAT TYPES
 *
 * Server-authoritative equipment stat definitions for procedural loot.
 * All stats are integers only (no floats).
 * Deterministic: No Math.random(), no Date.now().
 *
 * Stat keys are snake_case for consistency with loot affixes.
 * Aggregated stat blocks use camelCase for TypeScript ergonomics.
 */

/**
 * Allowlisted equipment stat keys.
 * Each stat maps to a specific gameplay effect.
 */
export type EquipmentStatKey =
  | "attack_power"
  | "defense"
  | "max_health"
  | "max_stamina"
  | "magic_find"
  | "gathering_yield"
  | "gathering_xp"
  | "loot_quality"
  | "critical_chance_per_mille";

/**
 * Individual stat with key and integer value.
 */
export interface EquipmentStat {
  key: EquipmentStatKey;
  value: number;
}

/**
 * Aggregated equipment stat block.
 * All values are integers.
 * Defaults to 0 for all stats.
 */
export interface EquipmentStatBlock {
  attackPower: number;
  defense: number;
  maxHealth: number;
  maxStamina: number;
  magicFind: number;
  gatheringYield: number;
  gatheringXp: number;
  lootQuality: number;
  criticalChancePerMille: number;
}

/**
 * Caps for each stat to prevent overflow/exploits.
 * These are enforced by the LootGovernor and EquipmentStatService.
 */
export const EQUIPMENT_STAT_CAPS: Readonly<Record<EquipmentStatKey, number>> = Object.freeze({
  attack_power: 100,
  defense: 100,
  max_health: 500,
  max_stamina: 500,
  magic_find: 300,
  gathering_yield: 5,
  gathering_xp: 500,
  loot_quality: 300,
  critical_chance_per_mille: 250,
});

/**
 * Create a default EquipmentStatBlock with all values at 0.
 */
export function createDefaultStatBlock(): EquipmentStatBlock {
  return Object.freeze({
    attackPower: 0,
    defense: 0,
    maxHealth: 0,
    maxStamina: 0,
    magicFind: 0,
    gatheringYield: 0,
    gatheringXp: 0,
    lootQuality: 0,
    criticalChancePerMille: 0,
  });
}

/**
 * Convert snake_case stat key to camelCase property name.
 */
export function statKeyToPropertyName(key: EquipmentStatKey): keyof EquipmentStatBlock {
  const mapping: Record<EquipmentStatKey, keyof EquipmentStatBlock> = {
    attack_power: "attackPower",
    defense: "defense",
    max_health: "maxHealth",
    max_stamina: "maxStamina",
    magic_find: "magicFind",
    gathering_yield: "gatheringYield",
    gathering_xp: "gatheringXp",
    loot_quality: "lootQuality",
    critical_chance_per_mille: "criticalChancePerMille",
  };
  return mapping[key];
}

/**
 * Check if a stat key is in the allowlist.
 */
export function isEquipmentStatKey(key: string): key is EquipmentStatKey {
  return key in EQUIPMENT_STAT_CAPS;
}

/**
 * Cap a stat value according to its maximum.
 */
export function capStatValue(key: EquipmentStatKey, value: number): number {
  const cap = EQUIPMENT_STAT_CAPS[key];
  return Math.max(0, Math.min(cap, Math.floor(value)));
}