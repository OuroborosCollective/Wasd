/**
 * Ouroboros LootDirector — KAPPA Grid Loot System
 * 
 * ARCHITECTURE (Stateless Determinism + Conservation Axiom):
 * - Loot is a physical world entity (type: 'LOOT')
 * - Loot generated deterministically from monster's SeededARERng
 * - 0-3 items per monster death based on monster tier
 * - Loot persists for ELECTROWEAK_LOOT_TTL_TICKS then decays
 * 
 * KAPPA GRID CONSERVATION (Anti-Exploit):
 * - Loot position = monster's current KAPPA position at death
 * - LootEntity stored in WorldTick.lootEntities Map
 * - Simultaneous pickup: first-click-wins, second gets REJECT
 * - No duplication possible — loot is removed atomically on pickup
 * 
 * SECURITY (Server Authority):
 * - Drop tables are server-side only
 * - Loot generation uses deterministic signature from world tick + monster seed
 * - Client cannot spawn, move, or duplicate loot entities
 * - Distance check enforced before pickup (prevents teleporting loot)
 */

import { createARESeed, SeededARERng } from "../../core/determinism/AREDeterminism.js";
import { MODULAR_COMPONENT_POOLS, type ItemSignature, forgeSignature, buildModularItem } from "@wasd/shared";
import { inventoryDirector } from "../inventory/InventoryDirector.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KappaCoord {
  x: number;
  y: number;
  z: number;
}

export interface LootEntity {
  id: string;
  type: "LOOT";
  position: KappaCoord;
  itemSignature: ItemSignature;
  itemName: string;
  rarity: string;
  ilvl: number;
  visualId: string;
  gold: number;
  ownerId?: string;      // Player who killed the monster
  spawnedAtTick: number;
  despawnAtTick: number;
}

export interface DropTableEntry {
  itemId: string;        // e.g., "blade_3" or "chest_5"
  weight: number;        // Higher = more likely
  minTier: number;       // Minimum monster tier to drop this
  unique?: boolean;       // Guaranteed drop (if tier met)
}

export interface MonsterDropConfig {
  minDrops: number;      // Minimum items (0-3 typical)
  maxDrops: number;      // Maximum items
  goldMin: number;       // Minimum gold drop
  goldMax: number;       // Maximum gold drop
  dropTable: DropTableEntry[];
}

// ─── Drop Tables ──────────────────────────────────────────────────────────────

const COMMON_MONSTER_DROPS: MonsterDropConfig = {
  minDrops: 0,
  maxDrops: 2,
  goldMin: 5,
  goldMax: 25,
  dropTable: [
    // Common weapons
    { itemId: "blade_1", weight: 30, minTier: 0 },
    { itemId: "blade_2", weight: 25, minTier: 0 },
    { itemId: "hilt_1", weight: 40, minTier: 0 },
    { itemId: "hilt_2", weight: 35, minTier: 0 },
    // Common materials
    { itemId: "material_iron", weight: 50, minTier: 0 },
    { itemId: "material_steel", weight: 20, minTier: 1 },
    { itemId: "material_silver", weight: 10, minTier: 2 },
    // Prefix/suffix (rare common drops)
    { itemId: "prefix_vorpal", weight: 5, minTier: 1 },
    { itemId: "suffix_bane", weight: 5, minTier: 1 },
  ],
};

const RARE_MONSTER_DROPS: MonsterDropConfig = {
  minDrops: 1,
  maxDrops: 3,
  goldMin: 20,
  goldMax: 75,
  dropTable: [
    // Better weapons
    { itemId: "blade_3", weight: 25, minTier: 0 },
    { itemId: "blade_4", weight: 20, minTier: 1 },
    { itemId: "blade_5", weight: 15, minTier: 2 },
    { itemId: "blade_6", weight: 10, minTier: 3 },
    // Armor
    { itemId: "chest_1", weight: 30, minTier: 0 },
    { itemId: "chest_2", weight: 25, minTier: 1 },
    { itemId: "chest_3", weight: 20, minTier: 2 },
    // Better materials
    { itemId: "material_steel", weight: 40, minTier: 0 },
    { itemId: "material_silver", weight: 30, minTier: 1 },
    { itemId: "material_mithril", weight: 15, minTier: 2 },
    // Prefixes/suffixes
    { itemId: "prefix_swift", weight: 10, minTier: 1 },
    { itemId: "prefix_brutal", weight: 10, minTier: 1 },
    { itemId: "suffix_wrath", weight: 8, minTier: 2 },
    { itemId: "suffix_doom", weight: 5, minTier: 3 },
    // Runes
    { itemId: "rune_fire", weight: 5, minTier: 2 },
    { itemId: "rune_ice", weight: 5, minTier: 2 },
  ],
};

const ELITE_MONSTER_DROPS: MonsterDropConfig = {
  minDrops: 2,
  maxDrops: 4,
  goldMin: 50,
  goldMax: 150,
  dropTable: [
    // High-tier weapons
    { itemId: "blade_5", weight: 25, minTier: 0 },
    { itemId: "blade_6", weight: 20, minTier: 1 },
    { itemId: "blade_7", weight: 15, minTier: 2 },
    { itemId: "blade_8", weight: 10, minTier: 3 },
    // High-tier armor
    { itemId: "chest_4", weight: 25, minTier: 0 },
    { itemId: "chest_5", weight: 20, minTier: 1 },
    { itemId: "chest_6", weight: 15, minTier: 2 },
    { itemId: "chest_7", weight: 10, minTier: 3 },
    // Rare materials
    { itemId: "material_mithril", weight: 40, minTier: 0 },
    { itemId: "material_adamantine", weight: 25, minTier: 1 },
    { itemId: "material_orichalcum", weight: 10, minTier: 2 },
    { itemId: "material_dragon_scale", weight: 5, minTier: 3 },
    // Rare prefixes
    { itemId: "prefix_cursed", weight: 10, minTier: 1 },
    { itemId: "prefix_holy", weight: 10, minTier: 1 },
    { itemId: "prefix_arcane", weight: 8, minTier: 2 },
    { itemId: "prefix_shadow", weight: 8, minTier: 2 },
    { itemId: "prefix_frost", weight: 8, minTier: 2 },
    // Rare suffixes
    { itemId: "suffix_fury", weight: 10, minTier: 1 },
    { itemId: "suffix_destr", weight: 8, minTier: 2 },
    { itemId: "suffix_judgment", weight: 5, minTier: 3 },
    { itemId: "suffix_ruin", weight: 5, minTier: 3 },
    // Runes (more common for elites)
    { itemId: "rune_fire", weight: 15, minTier: 0 },
    { itemId: "rune_ice", weight: 15, minTier: 0 },
    { itemId: "rune_lightning", weight: 10, minTier: 1 },
    { itemId: "rune_poison", weight: 10, minTier: 1 },
    { itemId: "rune_void", weight: 5, minTier: 2 },
    { itemId: "rune_holy", weight: 5, minTier: 2 },
    { itemId: "rune_shadow", weight: 5, minTier: 2 },
    { itemId: "rune_nature", weight: 5, minTier: 2 },
  ],
};

// ─── LootDirector ─────────────────────────────────────────────────────────────

export class LootDirector {
  private lootEntities: Map<string, LootEntity> = new Map();
  private worldTick = 0;
  private lootIdCounter = 0;
  
  // Loot TTL — matches electroweak pruning
  private readonly LOOT_TTL_TICKS = 1200;  // 2 minutes at 10Hz
  
  // Drop table tier thresholds
  private readonly ELITE_TIER_THRESHOLD = 10;  // monster level >= 10 = elite drops
  private readonly RARE_TIER_THRESHOLD = 5;    // monster level >= 5 = rare drops
  
  constructor() {}
  
  /**
   * Sync world tick for deterministic loot generation.
   */
  public setTick(tick: number): void {
    this.worldTick = tick;
  }
  
  /**
   * Get all active loot entities.
   */
  public getAllLoot(): LootEntity[] {
    return Array.from(this.lootEntities.values());
  }
  
  /**
   * Get loot entity by ID.
   */
  public getLoot(id: string): LootEntity | undefined {
    return this.lootEntities.get(id);
  }
  
  /**
   * Check if loot exists.
   */
  public hasLoot(id: string): boolean {
    return this.lootEntities.has(id);
  }
  
  /**
   * Generate loot drops for a dead monster.
   * Returns array of LootEntity to be added to world.
   * 
   * SECURITY: Deterministic — same monster/tick = same loot.
   */
  public generateDeathDrops(
    monsterId: string,
    monsterLevel: number,
    position: KappaCoord,
    ownerId?: string,
    dropTableSeed?: number
  ): LootEntity[] {
    // Select appropriate drop table based on monster level
    let dropConfig: MonsterDropConfig;
    if (monsterLevel >= this.ELITE_TIER_THRESHOLD) {
      dropConfig = ELITE_MONSTER_DROPS;
    } else if (monsterLevel >= this.RARE_TIER_THRESHOLD) {
      dropConfig = RARE_MONSTER_DROPS;
    } else {
      dropConfig = COMMON_MONSTER_DROPS;
    }
    
    // Create deterministic RNG from monster identity + world tick
    const rng = this.createLootRng(monsterId, dropTableSeed ?? 0);
    
    // Determine number of drops
    const numDrops = dropConfig.minDrops + Math.floor(rng.nextFloat() * (dropConfig.maxDrops - dropConfig.minDrops + 1));
    
    // Generate drops
    const lootItems: LootEntity[] = [];
    
    for (let i = 0; i < numDrops; i++) {
      // Select random item from weighted drop table
      const selectedEntry = this.selectWeightedDrop(dropConfig.dropTable, monsterLevel, rng);
      
      if (selectedEntry) {
        // Build the item signature
        const signature = this.buildItemSignature(selectedEntry.itemId, rng, i);
        const item = buildModularItem(signature, this.deriveIlvl(monsterLevel, selectedEntry.minTier));
        
        const lootId = `loot:${monsterId}:${this.worldTick}:${i}:${this.lootIdCounter++}`;
        
        const lootEntity: LootEntity = {
          id: lootId,
          type: "LOOT",
          position: { ...position },
          itemSignature: signature,
          itemName: item.name,
          rarity: item.rarity,
          ilvl: item.ilvl,
          visualId: item.visualId,
          gold: 0,  // Gold handled separately
          ownerId,
          spawnedAtTick: this.worldTick,
          despawnAtTick: this.worldTick + this.LOOT_TTL_TICKS,
        };
        
        lootItems.push(lootEntity);
        this.lootEntities.set(lootId, lootEntity);
      }
    }
    
    // Generate gold
    if (dropConfig.goldMin > 0 || dropConfig.goldMax > 0) {
      const goldAmount = Math.floor(dropConfig.goldMin + rng.nextFloat() * (dropConfig.goldMax - dropConfig.goldMin));
      
      if (goldAmount > 0) {
        const goldLootId = `gold:${monsterId}:${this.worldTick}:${this.lootIdCounter++}`;
        
        const goldLoot: LootEntity = {
          id: goldLootId,
          type: "LOOT",
          position: { ...position },
          itemSignature: "gold:currency",
          itemName: `${goldAmount} Gold`,
          rarity: "common",
          ilvl: 0,
          visualId: "gold_pile",
          gold: goldAmount,
          ownerId,
          spawnedAtTick: this.worldTick,
          despawnAtTick: this.worldTick + this.LOOT_TTL_TICKS,
        };
        
        lootItems.push(goldLoot);
        this.lootEntities.set(goldLootId, goldLoot);
      }
    }
    
    return lootItems;
  }
  
  /**
   * Attempt to pick up loot for a player.
   * Returns success/failure with details.
   * 
   * KAPPA GRID CONSERVATION: First-click wins, second gets REJECT.
   */
  public attemptPickup(
    lootId: string,
    playerId: string,
    playerPosition: KappaCoord,
    inventoryCapacity: number,
    maxWeight: number,
    currentWeight: number
  ): PickupResult {
    const loot = this.lootEntities.get(lootId);
    
    if (!loot) {
      return {
        success: false,
        code: "LOOT_NOT_FOUND",
        message: "Loot entity does not exist or has already been picked up.",
      };
    }
    
    // Check if loot has expired
    if (this.worldTick > loot.despawnAtTick) {
      this.lootEntities.delete(lootId);
      return {
        success: false,
        code: "LOOT_EXPIRED",
        message: "Loot has expired and despawned.",
      };
    }
    
    // Check distance (must be within pickup range)
    const distance = this.kappaDistance(playerPosition, loot.position);
    const PICKUP_RANGE = 2000;  // 2 kappa-meters
    
    if (distance > PICKUP_RANGE) {
      return {
        success: false,
        code: "TOO_FAR",
        message: `Too far from loot (${Math.round(distance)} kappa-meters). Move closer.`,
      };
    }
    
    // Check inventory weight
    const itemWeight = Math.max(1, loot.ilvl * 0.5);
    if (currentWeight + itemWeight > maxWeight) {
      return {
        success: false,
        code: "OVER_WEIGHT",
        message: "Cannot carry more weight. Free inventory space or unequip items.",
      };
    }
    
    // Check inventory slots
    if (inventoryCapacity <= 0) {
      return {
        success: false,
        code: "INVENTORY_FULL",
        message: "Inventory is full. Free a slot or drop an item.",
      };
    }
    
    // ATOMIC PICKUP — remove from world, add to inventory
    this.lootEntities.delete(lootId);
    
    return {
      success: true,
      lootId,
      itemSignature: loot.itemSignature,
      itemName: loot.itemName,
      rarity: loot.rarity,
      ilvl: loot.ilvl,
      gold: loot.gold,
    };
  }
  
  /**
   * Remove loot entity manually (admin, etc.)
   */
  public removeLoot(lootId: string): boolean {
    return this.lootEntities.delete(lootId);
  }
  
  /**
   * Clean up expired loot entities.
   * Called by WorldTick during electroweak pruning.
   */
  public pruneExpiredLoot(): LootEntity[] {
    const expired: LootEntity[] = [];
    
    for (const [id, loot] of this.lootEntities) {
      if (this.worldTick > loot.despawnAtTick) {
        expired.push(loot);
        this.lootEntities.delete(id);
      }
    }
    
    return expired;
  }
  
  // ─── Private Helper Methods ──────────────────────────────────────────────────
  
  /**
   * Create deterministic RNG for loot generation.
   */
  private createLootRng(monsterId: string, dropTableSeed: number): SeededARERng {
    return new SeededARERng(createARESeed([
      "loot",
      monsterId,
      this.worldTick,
      dropTableSeed,
    ]));
  }
  
  /**
   * Select item from weighted drop table.
   */
  private selectWeightedDrop(
    dropTable: DropTableEntry[],
    monsterLevel: number,
    rng: SeededARERng
  ): DropTableEntry | null {
    // Filter eligible drops (tier requirement met)
    const eligible = dropTable.filter(entry => entry.minTier <= monsterLevel);
    
    if (eligible.length === 0) return null;
    
    // Calculate total weight
    let totalWeight = 0;
    for (const entry of eligible) {
      totalWeight += entry.weight;
    }
    
    // Random selection
    const roll = rng.nextFloat() * totalWeight;
    
    let cumulative = 0;
    for (const entry of eligible) {
      cumulative += entry.weight;
      if (roll <= cumulative) {
        return entry;
      }
    }
    
    // Fallback (shouldn't happen)
    return eligible[eligible.length - 1];
  }
  
  /**
   * Build item signature from base component ID.
   */
  private buildItemSignature(baseId: string, rng: SeededARERng, slotIndex: number): ItemSignature {
    // Determine component type
    const isWeapon = baseId.startsWith("blade_") || baseId.startsWith("axe_") || 
                     baseId.startsWith("mace_") || baseId.startsWith("spear_") ||
                     baseId.startsWith("bow_");
    
    // Select other components deterministically
    let hiltIdx: number, materialIdx: number, prefixIdx: number, suffixIdx: number, runeIdx: number;
    
    if (isWeapon) {
      hiltIdx = Math.abs(rng.nextInt(1000000)) % MODULAR_COMPONENT_POOLS.hilts.length;
      materialIdx = Math.abs(rng.nextInt(1000000) >> 4) % MODULAR_COMPONENT_POOLS.materials.length;
      
      // Prefix/suffix/rune are rarer
      prefixIdx = Math.abs(rng.nextInt(1000000) >> 8) % MODULAR_COMPONENT_POOLS.prefixes.length;
      suffixIdx = Math.abs(rng.nextInt(1000000) >> 12) % MODULAR_COMPONENT_POOLS.suffixes.length;
      runeIdx = Math.abs(rng.nextInt(1000000) >> 16) % MODULAR_COMPONENT_POOLS.runes.length;
    } else {
      // Armor — no hilt
      hiltIdx = -1;
      materialIdx = Math.abs(rng.nextInt(1000000)) % MODULAR_COMPONENT_POOLS.materials.length;
      
      prefixIdx = Math.abs(rng.nextInt(1000000) >> 8) % MODULAR_COMPONENT_POOLS.prefixes.length;
      suffixIdx = Math.abs(rng.nextInt(1000000) >> 12) % MODULAR_COMPONENT_POOLS.suffixes.length;
      runeIdx = Math.abs(rng.nextInt(1000000) >> 16) % MODULAR_COMPONENT_POOLS.runes.length;
    }
    
    // 20% chance for prefix, 15% for suffix, 10% for rune
    const hasPrefix = rng.nextFloat() < 0.2;
    const hasSuffix = rng.nextFloat() < 0.15;
    const hasRune = rng.nextFloat() < 0.1;
    
    const components = [
      `base:${baseId}`,
      isWeapon ? `hilt:${MODULAR_COMPONENT_POOLS.hilts[hiltIdx]}` : null,
      `material:${MODULAR_COMPONENT_POOLS.materials[materialIdx]}`,
      hasPrefix ? `prefix:${MODULAR_COMPONENT_POOLS.prefixes[prefixIdx]}` : null,
      hasSuffix ? `suffix:${MODULAR_COMPONENT_POOLS.suffixes[suffixIdx]}` : null,
      hasRune ? `rune:${MODULAR_COMPONENT_POOLS.runes[runeIdx]}` : null,
    ].filter(Boolean);
    
    return components.join("|") as ItemSignature;
  }
  
  /**
   * Derive item level from monster level and tier requirement.
   */
  private deriveIlvl(monsterLevel: number, tierReq: number): number {
    const base = Math.max(1, monsterLevel - tierReq);
    return Math.min(60, base * 2 + tierReq);
  }
  
  /**
   * Calculate KAPPA-distance between two positions.
   */
  private kappaDistance(a: KappaCoord, b: KappaCoord): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z ?? 0) - (b.z ?? 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

// ─── Result Types ──────────────────────────────────────────────────────────────

export interface PickupResult {
  success: boolean;
  code?: "LOOT_NOT_FOUND" | "LOOT_EXPIRED" | "TOO_FAR" | "OVER_WEIGHT" | "INVENTORY_FULL";
  message?: string;
  lootId?: string;
  itemSignature?: string;
  itemName?: string;
  rarity?: string;
  ilvl?: number;
  gold?: number;
}

// ─── Singleton Export ──────────────────────────────────────────────────────────

export const lootDirector = new LootDirector();