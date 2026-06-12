/**
 * OuroborosLootGenerator - Deterministic Diablo-Style Loot System
 * 
 * Phase 11: Ouroboros Grand Unification with ARE-Logic
 * 
 * Axiom 2: Nomock-Theorem (NO random, NO external data)
 * Axiom 3: Zeitstempel-Integrität (tick-basiert)
 * 
 * Generates loot from hash contracts without storing item IDs.
 * Same seed = same loot (100% deterministic).
 */

import { KAPPA, type KappaInt } from '../are/Kappa.js';
import { kappa1000Hash } from '../are/KappaLayers.js';
import type { TickId } from '../are/types.js';
import {
  OUROBOROS_CONFIG,
  type LootDrop,
  LootRarity
} from './OuroborosTypes.js';

/**
 * Base item types for loot generation
 */
const BASE_ITEMS: ReadonlyArray<string> = Object.freeze([
  'Sword',
  'Axe',
  'Mace',
  'Spear',
  'Dagger',
  'Bow',
  'Staff',
  'Shield',
  'Helm',
  'Chest',
  'Gauntlets',
  'Boots',
  'Belt',
  'Ring',
  'Amulet',
  'Potion',
  'Scroll',
  'Herb',
  'Ore',
  'Gem'
]);

/**
 * Item prefixes (magical modifiers)
 */
const PREFIXES: ReadonlyArray<string> = Object.freeze([
  'Rusty',
  'Iron',
  'Steel',
  'Silver',
  'Golden',
  'Diamond',
  'Shadow',
  'Crimson',
  'Azure',
  'Emerald',
  'Onyx',
  'Jade',
  'Blood',
  'Storm',
  'Frost',
  'Fire',
  'Earth',
  'Wind',
  'Light',
  'Dark'
]);

/**
 * Item suffixes (additional modifiers)
 */
const SUFFIXES: ReadonlyArray<string> = Object.freeze([
  'of Might',
  'of Speed',
  'of Wisdom',
  'of Fortune',
  'of the Bear',
  'of the Wolf',
  'of the Eagle',
  'of the Serpent',
  'of Protection',
  'of Destruction',
  'of Shadows',
  'of Light',
  'of the Ancients',
  'of the Void',
  'of Storms',
  'of Flames',
  'of Ice',
  'of Earth',
  'of Wind',
  'of Power'
]);

/**
 * Special mythic suffixes for dungeon drops
 */
const MYTHIC_SUFFIXES: ReadonlyArray<string> = Object.freeze([
  'of the Fallen Kingdom',
  'of Ouroboros',
  'of Eternal Return',
  'of the First Dawn',
  'of the Last Twilight',
  'of the Forgotten',
  'of the Resurrected',
  'of Shadow Memory',
  'of the Endless Cycle',
  'of New Beginnings'
]);

/**
 * OuroborosLootGenerator - Deterministic loot generation
 */
export class OuroborosLootGenerator {
  private readonly config = OUROBOROS_CONFIG.LOOT;

  /**
   * Generate deterministic loot drop.
   * 
   * @param playerSeed - Player identifier for seed variation
   * @param bossMythosSeed - Mythos seed from dungeon (Ouroboros event)
   * @param tick - Current tick (deterministic)
   * @param isMythicBoss - Whether this is a mythic boss (dungeon owner)
   * @returns Generated loot drop
   */
  generateLoot(
    playerSeed: string,
    bossMythosSeed: number,
    tick: TickId,
    isMythicBoss: boolean = false
  ): LootDrop {
    // Divine Hash Contract (Axiom 2: No random)
    const divineHash = this.computeDivineHash(playerSeed, bossMythosSeed, tick);
    
    // Extract loot components via modulo (deterministic)
    const baseTypeIndex = divineHash % BASE_ITEMS.length;
    const rarityThreshold = (divineHash >> 8) % 1000;
    const prefixIndex = (divineHash >> 16) % PREFIXES.length;
    
    // Choose suffix array based on mythic boss status
    const suffixArray = isMythicBoss ? MYTHIC_SUFFIXES : SUFFIXES;
    const suffixIndex = (divineHash >> 24) % suffixArray.length;
    
    return {
      baseType: BASE_ITEMS[baseTypeIndex],
      rarity: this.getRarity(rarityThreshold),
      prefix: PREFIXES[prefixIndex],
      suffix: suffixArray[suffixIndex],
      statBonus: this.computeStatBonus(divineHash, rarityThreshold) as unknown as KappaInt
    } as LootDrop;
  }

  /**
   * Generate multiple loot drops for a single encounter.
   */
  generateLootTable(
    playerSeed: string,
    bossMythosSeed: number,
    tick: TickId,
    dropCount: number,
    mythicDropChance: number = 0.1
  ): LootDrop[] {
    const drops: LootDrop[] = [];
    
    for (let i = 0; i < dropCount; i++) {
      // Vary seed for each drop
      const dropSeed = `${playerSeed}_${i}`;
      const dropTick = (Number(tick) + i) as TickId;
      
      // Determine if this is a mythic drop
      const isMythic = i === 0 && mythicDropChance > 0;
      
      drops.push(this.generateLoot(dropSeed, bossMythosSeed, dropTick, isMythic));
    }
    
    return drops;
  }

  /**
   * Generate loot for a dungeon boss (Ouroboros FALLEN event).
   * 
   * @param playerSeed - Player identifier
   * @param dungeonSeed - Mythos seed from OuroborosCycleSystem
   * @param tick - Current tick
   * @returns Boss loot table
   */
  generateBossLoot(
    playerSeed: string,
    dungeonSeed: number,
    tick: TickId
  ): LootDrop[] {
    // Boss drops: 3-5 items
    const dropCount = 3 + (kappa1000Hash(`${dungeonSeed}_${tick}`) % 3);
    
    // First drop is always mythic
    const drops = this.generateLootTable(playerSeed, dungeonSeed, tick, dropCount, 1.0);
    
    return drops;
  }

  /**
   * Compute divine hash for loot generation.
   */
  private computeDivineHash(
    playerSeed: string,
    bossMythosSeed: number,
    tick: TickId
  ): number {
    const input = `${playerSeed}_${bossMythosSeed}_${tick}_${KAPPA}`;
    return kappa1000Hash(input);
  }

  /**
   * Determine rarity from threshold.
   */
  private getRarity(threshold: number): LootRarity {
    if (threshold >= this.config.LEGENDARY_THRESHOLD) {
      return LootRarity.LEGENDARY;
    }
    if (threshold >= this.config.EPIC_THRESHOLD) {
      return LootRarity.EPIC;
    }
    if (threshold >= this.config.RARE_THRESHOLD) {
      return LootRarity.RARE;
    }
    return LootRarity.COMMON;
  }

  /**
   * Compute stat bonus based on rarity and hash.
   */
  private computeStatBonus(divineHash: number, rarityThreshold: number): KappaInt {
    // Base stat bonus from hash
    const baseBonus = divineHash % 50;
    
    // Rarity multiplier
    let multiplier = 1.0;
    if (rarityThreshold >= this.config.LEGENDARY_THRESHOLD) {
      multiplier = 5.0;
    } else if (rarityThreshold >= this.config.EPIC_THRESHOLD) {
      multiplier = 3.0;
    } else if (rarityThreshold >= this.config.RARE_THRESHOLD) {
      multiplier = 2.0;
    }
    
    // Apply multiplier and add base
    const bonus = Math.round((baseBonus + 10) * multiplier);
    
    // Cap at reasonable maximum
    return Math.min(bonus, 500) as unknown as KappaInt;
  }

  /**
   * Verify that a loot drop matches expected hash.
   */
  verifyLootDrop(
    drop: LootDrop,
    playerSeed: string,
    bossMythosSeed: number,
    tick: TickId
  ): boolean {
    const expected = this.generateLoot(playerSeed, bossMythosSeed, tick);
    return (
      drop.baseType === expected.baseType &&
      drop.rarity === expected.rarity &&
      drop.prefix === expected.prefix &&
      drop.suffix === expected.suffix
    );
  }
}

// Singleton instance
let lootGeneratorInstance: OuroborosLootGenerator | null = null;

export function getOuroborosLootGenerator(): OuroborosLootGenerator {
  if (!lootGeneratorInstance) {
    lootGeneratorInstance = new OuroborosLootGenerator();
  }
  return lootGeneratorInstance;
}

/**
 * Format loot drop as readable string.
 */
export function formatLootDrop(drop: LootDrop): string {
  return `${drop.prefix} ${drop.baseType} ${drop.suffix} (+${drop.statBonus}) [${drop.rarity}]`;
}