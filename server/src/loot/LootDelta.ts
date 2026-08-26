'use strict';

/**
 * Loot Delta Types
 * 
 * Canonical loot write path:
 * Combat defeat -> loot_roll_context -> AREInfiniteLootMachine (ProceduralLootMachine) -> loot_delta
 * 
 * LootDelta is the ONLY write path into inventory/world-drop state.
 */

export interface LootDeltaItem {
  uid: string;
  itemId: string;
  name: string;
  rarity: string;
  quantity: number;
  position: { x: number; y: number; z: number };
  rollHash: string;
}

export interface LootDelta {
  /** Unique identifier for this loot event - prevents duplicate drops */
  idempotencyKey: string;
  
  /** The stable loot roll context that generated this delta */
  lootRollContext: LootRollContextCanonical;
  
  /** Deterministic seed hash used for this loot roll */
  seedHash: string;
  
  /** All items dropped in this event, stably sorted by rollHash */
  items: readonly LootDeltaItem[];
  
  /** When this delta was created (server tick) */
  createdAtTick: number;
  
  /** Player who should receive this loot */
  playerId: string;
}

export interface LootRollContextCanonical {
  /** Stable source entity that triggered the loot roll */
  sourceEntityId: string;
  
  /** Entity that was defeated (if applicable) */
  defeatedEntityId: string;
  
  /** Actor that performed the action */
  actorId: string;
  
  /** Server tick when the roll occurred */
  sourceTick: number;
  
  /** Chunk key for spatial locality */
  chunkKey: string;
  
  /** World hash for world-level determinism */
  worldHash: string;
  
  /** Chunk-specific hash */
  chunkHash: string;
  
  /** Kappa/seed context for determinism */
  kappa: string;
  
  /** Optional encounter identifier */
  encounterId?: string;
  
  /** Loot index for multiple drops in single event */
  lootIndex: number;
  
  /** Treasure class to use */
  treasureClassId: string;
  
  /** Area level for scaling */
  areaLevel: number;
  
  /** Magic find bonus */
  magicFind?: number;
  
  /** Kill streak bonus */
  killStreak?: number;
  
  /** Source rank (NORMAL, ELITE, BOSS, WORLD_BOSS) */
  sourceRank?: string;
  
  /** Biome for mutation context */
  biomeId?: string;
  
  /** Faction for mutation context */
  factionId?: string;
  
  /** Social string for mutation context */
  socialString?: string;
}

/**
 * Create a stable idempotency key from a LootRollContext
 * Same context always produces same key
 */
export function createIdempotencyKey(ctx: LootRollContextCanonical): string {
  return [
    'loot',
    ctx.sourceEntityId,
    ctx.defeatedEntityId,
    ctx.actorId,
    String(ctx.sourceTick),
    ctx.lootIndex
  ].join('|');
}

/**
 * Create a deterministic seed from LootRollContext
 */
export function createLootSeed(ctx: LootRollContextCanonical, version = 'ARE_LOOT_SEED_V1'): string {
  return [
    version,
    ctx.sourceEntityId,
    ctx.defeatedEntityId,
    ctx.actorId,
    String(ctx.sourceTick),
    String(ctx.lootIndex),
    ctx.treasureClassId,
    String(ctx.areaLevel),
    ctx.worldHash,
    ctx.chunkHash
  ].join('|');
}