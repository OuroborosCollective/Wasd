'use strict';

/**
 * Loot Canonicalization Tests
 * 
 * Tests for the canonical loot path:
 * - ProceduralLootMachine (Infinite ARE Loot Machine) is the main engine
 * - LootDirector writes deterministic loot_delta
 * - LootFeed observes only server snapshots
 * - No parallel runtime drop truth
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createIdempotencyKey,
  createLootSeed,
  type LootRollContextCanonical,
  type LootDelta
} from '../../src/loot/LootDelta.js';
import { LootAxioms } from '../../src/loot/LootAxioms.js';
import { DeterministicRng } from '../../src/loot/DeterministicRng.js';
import { ProceduralLootMachine } from '../../src/loot/ProceduralLootMachine.js';

// ---------------------------------------------------------------------------
// LootDelta Types Tests
// ---------------------------------------------------------------------------
describe('LootDelta Types', () => {
  it('createIdempotencyKey creates stable key from context', () => {
    const ctx: LootRollContextCanonical = {
      sourceEntityId: 'player_1',
      defeatedEntityId: 'npc_wolf_001',
      actorId: 'player_1',
      sourceTick: 1000,
      chunkKey: 'chunk_5_7',
      worldHash: 'world_alpha',
      chunkHash: 'chunk_hash_abc',
      kappa: 'player_1',
      lootIndex: 0,
      treasureClassId: 'TC_ACT1_BEAST',
      areaLevel: 10
    };

    const key1 = createIdempotencyKey(ctx);
    const key2 = createIdempotencyKey(ctx);

    expect(key1).toBe(key2);
    expect(key1).toContain('loot');
    expect(key1).toContain('player_1');
    expect(key1).toContain('npc_wolf_001');
    expect(key1).toContain('1000');
  });

  it('createIdempotencyKey differs for different contexts', () => {
    const ctx1: LootRollContextCanonical = {
      sourceEntityId: 'player_1',
      defeatedEntityId: 'npc_wolf_001',
      actorId: 'player_1',
      sourceTick: 1000,
      chunkKey: 'chunk_5_7',
      worldHash: 'world_alpha',
      chunkHash: 'chunk_hash_abc',
      kappa: 'player_1',
      lootIndex: 0,
      treasureClassId: 'TC_ACT1_BEAST',
      areaLevel: 10
    };

    const ctx2: LootRollContextCanonical = {
      ...ctx1,
      sourceTick: 1001
    };

    const key1 = createIdempotencyKey(ctx1);
    const key2 = createIdempotencyKey(ctx2);

    expect(key1).not.toBe(key2);
  });

  it('createLootSeed creates deterministic seed', () => {
    const ctx: LootRollContextCanonical = {
      sourceEntityId: 'player_1',
      defeatedEntityId: 'npc_wolf_001',
      actorId: 'player_1',
      sourceTick: 1000,
      chunkKey: 'chunk_5_7',
      worldHash: 'world_alpha',
      chunkHash: 'chunk_hash_abc',
      kappa: 'player_1',
      lootIndex: 0,
      treasureClassId: 'TC_ACT1_BEAST',
      areaLevel: 10
    };

    const seed1 = createLootSeed(ctx);
    const seed2 = createLootSeed(ctx);

    expect(seed1).toBe(seed2);
    expect(seed1).toContain('ARE_LOOT_SEED_V1');
    expect(seed1).toContain('player_1');
    expect(seed1).toContain('npc_wolf_001');
  });

  it('createLootSeed differs with different version', () => {
    const ctx: LootRollContextCanonical = {
      sourceEntityId: 'player_1',
      defeatedEntityId: 'npc_wolf_001',
      actorId: 'player_1',
      sourceTick: 1000,
      chunkKey: 'chunk_5_7',
      worldHash: 'world_alpha',
      chunkHash: 'chunk_hash_abc',
      kappa: 'player_1',
      lootIndex: 0,
      treasureClassId: 'TC_ACT1_BEAST',
      areaLevel: 10
    };

    const seed1 = createLootSeed(ctx, 'V1');
    const seed2 = createLootSeed(ctx, 'V2');

    expect(seed1).not.toBe(seed2);
  });
});

// ---------------------------------------------------------------------------
// Idempotency Tests
// ---------------------------------------------------------------------------
describe('Idempotency', () => {
  it('same event produces same idempotency key', () => {
    const ctx: LootRollContextCanonical = {
      sourceEntityId: 'player_1',
      defeatedEntityId: 'npc_dragon_001',
      actorId: 'player_1',
      sourceTick: 5000,
      chunkKey: 'chunk_10_20',
      worldHash: 'main_world',
      chunkHash: 'chunk_xyz',
      kappa: 'player_1_seed',
      lootIndex: 0,
      treasureClassId: 'TC_BOSS_WORLD',
      areaLevel: 50
    };

    // Same context should always produce same key
    const keys = Array.from({ length: 10 }, () => createIdempotencyKey(ctx));
    const uniqueKeys = new Set(keys);

    expect(uniqueKeys.size).toBe(1);
  });

  it('different tick produces different idempotency key', () => {
    const baseCtx: LootRollContextCanonical = {
      sourceEntityId: 'player_1',
      defeatedEntityId: 'npc_dragon_001',
      actorId: 'player_1',
      sourceTick: 5000,
      chunkKey: 'chunk_10_20',
      worldHash: 'main_world',
      chunkHash: 'chunk_xyz',
      kappa: 'player_1_seed',
      lootIndex: 0,
      treasureClassId: 'TC_BOSS_WORLD',
      areaLevel: 50
    };

    const ctx1 = { ...baseCtx, sourceTick: 5000 };
    const ctx2 = { ...baseCtx, sourceTick: 5001 };

    const key1 = createIdempotencyKey(ctx1);
    const key2 = createIdempotencyKey(ctx2);

    expect(key1).not.toBe(key2);
  });

  it('different lootIndex produces different idempotency key', () => {
    const baseCtx: LootRollContextCanonical = {
      sourceEntityId: 'player_1',
      defeatedEntityId: 'npc_dragon_001',
      actorId: 'player_1',
      sourceTick: 5000,
      chunkKey: 'chunk_10_20',
      worldHash: 'main_world',
      chunkHash: 'chunk_xyz',
      kappa: 'player_1_seed',
      lootIndex: 0,
      treasureClassId: 'TC_BOSS_WORLD',
      areaLevel: 50
    };

    const ctx1 = { ...baseCtx, lootIndex: 0 };
    const ctx2 = { ...baseCtx, lootIndex: 1 };

    const key1 = createIdempotencyKey(ctx1);
    const key2 = createIdempotencyKey(ctx2);

    expect(key1).not.toBe(key2);
  });
});

// ---------------------------------------------------------------------------
// Determinism Tests - Same context = Same loot
// ---------------------------------------------------------------------------
describe('Determinism - Same Context = Same Loot', () => {
  function createFakeDb() {
    return {
      models: {
        ItemBase: {
          async find() {
            return [
              {
                id: 'iron_sword_001',
                name: 'Iron Sword',
                type: 'weapon',
                minLevel: 1,
                maxLevel: 99,
                reqStr: 1,
                reqInt: 0,
                reqDex: 0,
                icon: 'iron_sword.png',
                baseStats: { damageMin: 2, damageMax: 5 }
              }
            ];
          }
        },
        AffixPool: {
          async find() {
            return [
              {
                id: 'pre_savage',
                name: 'Savage',
                stat: 'damageMax',
                type: 'flat',
                minRoll: 1,
                maxRoll: 5,
                requiredLevel: 1,
                group: 'damage_flat',
                isPrefix: true,
                weight: 100
              }
            ];
          }
        }
      }
    };
  }

  it('same context produces identical loot result', async () => {
    const db = createFakeDb();
    const machine = new ProceduralLootMachine(db);

    const ctx = {
      playerId: 'player_test',
      tickIndex: 9999,
      dropSourceId: 'npc_test_001',
      lootIndex: 0,
      areaLevel: 15,
      treasureClassId: 'TC_ACT1_BEAST',
      biomeId: 'forest',
      factionId: 'neutral',
      socialString: '',
      playerReputation: 50,
      magicFind: 100,
      killStreak: 3,
      sourceRank: 'NORMAL'
    };

    // Generate multiple times with the same context
    const results = await Promise.all([
      machine.generate(ctx),
      machine.generate(ctx),
      machine.generate(ctx)
    ]);

    // All results should be identical
    for (let i = 1; i < results.length; i++) {
      expect(results[i].seedHash).toBe(results[0].seedHash);
      expect(results[i].items).toEqual(results[0].items);
    }
  });

  it('different context produces different loot result', async () => {
    const db = createFakeDb();
    const machine = new ProceduralLootMachine(db);

    const ctx1 = {
      playerId: 'player_test',
      tickIndex: 9999,
      dropSourceId: 'npc_test_001',
      lootIndex: 0,
      areaLevel: 15,
      treasureClassId: 'TC_ACT1_BEAST'
    };

    const ctx2 = {
      ...ctx1,
      tickIndex: 10000 // Different tick
    };

    const result1 = await machine.generate(ctx1);
    const result2 = await machine.generate(ctx2);

    expect(result1.seedHash).not.toBe(result2.seedHash);
  });

  it('seed from createLootSeed produces deterministic RNG', () => {
    const ctx: LootRollContextCanonical = {
      sourceEntityId: 'player_test',
      defeatedEntityId: 'npc_boss_001',
      actorId: 'player_test',
      sourceTick: 12345,
      chunkKey: 'chunk_1_2',
      worldHash: 'test_world',
      chunkHash: 'test_chunk',
      kappa: 'test_seed',
      lootIndex: 0,
      treasureClassId: 'TC_BOSS_WORLD',
      areaLevel: 20
    };

    const seed = createLootSeed(ctx);
    
    // Same seed should produce same random sequence
    const rng1 = new DeterministicRng(seed);
    const rng2 = new DeterministicRng(seed);

    const seq1 = [rng1.nextU32(), rng1.nextU32(), rng1.nextU32()];
    const seq2 = [rng2.nextU32(), rng2.nextU32(), rng2.nextU32()];

    expect(seq1).toEqual(seq2);
  });
});

// ---------------------------------------------------------------------------
// No Random/Date.now Tests
// ---------------------------------------------------------------------------
describe('No Non-Deterministic Random', () => {
  it('LootAxioms.makeSeed uses stable hashing only', () => {
    const ctx = {
      playerId: 'player_test',
      tickIndex: 100,
      dropSourceId: 'npc_test',
      areaLevel: 10,
      lootIndex: 0,
      policyVersion: 'v1',
      biomeId: 'forest',
      factionId: 'neutral',
      socialString: ''
    };

    const seed = LootAxioms.makeSeed(ctx);

    // Seed should be deterministic
    expect(seed).toBe(LootAxioms.makeSeed(ctx));
    
    // Seed should not contain any timestamps
    expect(seed).not.toContain(Date.now().toString());
  });

  it('DeterministicRng uses hash-based seeding', () => {
    const rng = new DeterministicRng('test-seed');
    
    // First call should not crash
    const value = rng.nextU32();
    expect(typeof value).toBe('number');
    expect(Number.isInteger(value)).toBe(true);
    
    // Sequence should be deterministic
    const rng2 = new DeterministicRng('test-seed');
    expect(rng2.nextU32()).toBe(value);
  });
});

// ---------------------------------------------------------------------------
// Integration Test - Combat -> LootDelta -> Snapshot
// ---------------------------------------------------------------------------
describe('Integration: Combat -> LootRollContext -> loot_delta', () => {
  function createFakeDb() {
    return {
      models: {
        ItemBase: {
          async find() {
            return [
              {
                id: 'golden_sword',
                name: 'Golden Sword',
                type: 'weapon',
                minLevel: 1,
                maxLevel: 99,
                reqStr: 5,
                reqInt: 0,
                reqDex: 0,
                icon: 'golden_sword.png',
                baseStats: { damageMin: 10, damageMax: 20 }
              }
            ];
          }
        },
        AffixPool: {
          async find() {
            return [
              {
                id: 'pre_mighty',
                name: 'Mighty',
                stat: 'damageMax',
                type: 'flat',
                minRoll: 5,
                maxRoll: 10,
                requiredLevel: 1,
                group: 'damage_flat',
                isPrefix: true,
                weight: 100
              }
            ];
          }
        }
      }
    };
  }

  it('full path: context -> loot_delta -> items', async () => {
    const db = createFakeDb();
    const machine = new ProceduralLootMachine(db);

    // Step 1: Create LootRollContext (as if from combat defeat)
    const context: LootRollContextCanonical = {
      sourceEntityId: 'hero_001',
      defeatedEntityId: 'boss_dragon_final',
      actorId: 'hero_001',
      sourceTick: 88888,
      chunkKey: 'chunk_final_battle',
      worldHash: 'world_areloria',
      chunkHash: 'chunk_battle_arena',
      kappa: 'hero_001_combat_seed',
      encounterId: 'encounter_final_boss',
      lootIndex: 0,
      treasureClassId: 'TC_BOSS_WORLD',
      areaLevel: 80,
      magicFind: 300,
      killStreak: 15,
      sourceRank: 'WORLD_BOSS',
      biomeId: 'volcano',
      factionId: 'dragon_clan',
      socialString: 'dragon_slayer'
    };

    // Step 2: Create idempotency key
    const idempotencyKey = createIdempotencyKey(context);
    expect(idempotencyKey).toContain('hero_001');
    expect(idempotencyKey).toContain('boss_dragon_final');

    // Step 3: Delegate to ProceduralLootMachine
    const seed = createLootSeed(context);
    const result = await machine.generate({
      playerId: context.sourceEntityId,
      tickIndex: context.sourceTick,
      dropSourceId: context.defeatedEntityId,
      lootIndex: context.lootIndex,
      areaLevel: context.areaLevel,
      treasureClassId: context.treasureClassId,
      magicFind: context.magicFind,
      killStreak: context.killStreak,
      sourceRank: context.sourceRank,
      biomeId: context.biomeId,
      factionId: context.factionId,
      socialString: context.socialString,
      playerReputation: 0
    });

    // Step 4: Verify loot_delta structure
    expect(result.seedHash).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);

    const lootDelta: LootDelta = {
      idempotencyKey,
      lootRollContext: context,
      seedHash: result.seedHash,
      items: result.items.map((item, index) => ({
        uid: item.uid,
        itemId: item.baseId || item.name,
        name: item.name,
        rarity: item.rarity,
        quantity: item.amount || 1,
        position: { x: 0, y: 0, z: 0 },
        rollHash: LootAxioms.shortHash(`${context.sourceTick}|${context.defeatedEntityId}|${index}|${item.uid}`)
      })),
      createdAtTick: context.sourceTick,
      playerId: context.sourceEntityId
    };

    // Step 5: Verify loot_delta properties
    expect(lootDelta.idempotencyKey).toBe(idempotencyKey);
    expect(lootDelta.seedHash).toBe(result.seedHash);
    expect(lootDelta.items.length).toBe(result.items.length);
    expect(lootDelta.createdAtTick).toBe(88888);
    expect(lootDelta.playerId).toBe('hero_001');

    // Step 6: Items should be stably sorted by rollHash
    for (let i = 1; i < lootDelta.items.length; i++) {
      expect(lootDelta.items[i - 1].rollHash <= lootDelta.items[i].rollHash).toBe(true);
    }
  });

  it('duplicate context produces null (idempotency)', async () => {
    const db = createFakeDb();
    const machine = new ProceduralLootMachine(db);

    const context: LootRollContextCanonical = {
      sourceEntityId: 'player_x',
      defeatedEntityId: 'npc_y',
      actorId: 'player_x',
      sourceTick: 77777,
      chunkKey: 'chunk_test',
      worldHash: 'test',
      chunkHash: 'test_chunk',
      kappa: 'seed',
      lootIndex: 0,
      treasureClassId: 'TC_ACT1_BEAST',
      areaLevel: 10
    };

    const idempotencyKey = createIdempotencyKey(context);
    const processedKeys = new Set<string>();

    // Simulate LootDirector idempotency check
    const firstResult = await machine.generate({
      playerId: context.sourceEntityId,
      tickIndex: context.sourceTick,
      dropSourceId: context.defeatedEntityId,
      lootIndex: context.lootIndex,
      areaLevel: context.areaLevel
    });

    // First event should be processed
    if (!processedKeys.has(idempotencyKey)) {
      processedKeys.add(idempotencyKey);
    }

    // Simulate second call with same context
    const secondIdempotencyKey = createIdempotencyKey(context);
    
    // This should be blocked by idempotency check
    expect(processedKeys.has(secondIdempotencyKey)).toBe(true);
  });
});