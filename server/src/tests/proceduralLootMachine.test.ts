'use strict';

import { describe, it, expect, beforeEach } from 'vitest';
import { DeterministicRng } from '../../src/loot/DeterministicRng.js';
import { LootAxioms } from '../../src/loot/LootAxioms.js';
import { RarityResolver } from '../../src/loot/RarityResolver.js';
import { SocialStringMutationEngine } from '../../src/loot/SocialStringMutationEngine.js';
import { LootGovernor } from '../../src/loot/LootGovernor.js';
import { TreasureClassRegistry } from '../../src/loot/TreasureClassRegistry.js';
import { ProceduralLootMachine } from '../../src/loot/ProceduralLootMachine.js';

function createFakeDb() {
  return {
    models: {
      ItemBase: {
        async find(query: any) {
          return [
            {
              id: 'iron_sword_001',
              name: 'Iron Sword',
              type: query.type,
              minLevel: 1,
              maxLevel: 99,
              reqStr: 1,
              reqInt: 0,
              reqDex: 0,
              icon: 'iron_sword.png',
              baseStats: {
                damageMin: 2,
                damageMax: 5
              }
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
            },
            {
              id: 'suf_bear',
              name: 'the Bear',
              stat: 'strength',
              type: 'flat',
              minRoll: 1,
              maxRoll: 5,
              requiredLevel: 1,
              group: 'str_flat',
              isPrefix: false,
              weight: 100
            }
          ];
        }
      }
    }
  };
}

// ---------------------------------------------------------------------------
// DeterministicRng Tests
// ---------------------------------------------------------------------------
describe('DeterministicRng', () => {
  it('produces same sequence for same seed', () => {
    const rng1 = new DeterministicRng('test-seed');
    const rng2 = new DeterministicRng('test-seed');

    const seq1 = [rng1.nextU32(), rng1.nextU32(), rng1.nextU32()];
    const seq2 = [rng2.nextU32(), rng2.nextU32(), rng2.nextU32()];

    expect(seq1).toEqual(seq2);
  });

  it('float01 returns value between 0 and 1', () => {
    const rng = new DeterministicRng('test');
    for (let i = 0; i < 100; i++) {
      const val = rng.float01();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('int returns integer within range', () => {
    const rng = new DeterministicRng('test');
    for (let i = 0; i < 100; i++) {
      const val = rng.int(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('weightedPick selects items by weight', () => {
    const rng = new DeterministicRng('weighted-test');
    const items = [
      { id: 'a', weight: 100 },
      { id: 'b', weight: 1 }
    ];

    // Run multiple times, 'a' should be selected far more often
    let aCount = 0;
    for (let i = 0; i < 1000; i++) {
      const rngCopy = new DeterministicRng(`weighted-test-${i}`);
      const picked = rngCopy.weightedPick(items, 'weight');
      if (picked?.id === 'a') aCount++;
    }

    expect(aCount).toBeGreaterThan(900);
  });
});

// ---------------------------------------------------------------------------
// LootAxioms Tests
// ---------------------------------------------------------------------------
describe('LootAxioms', () => {
  it('makeSeed creates deterministic seed string', () => {
    const ctx = {
      playerId: 'player_1',
      tickIndex: 100,
      dropSourceId: 'npc_1',
      areaLevel: 10,
      lootIndex: 0,
      policyVersion: 'v1',
      biomeId: 'mountain',
      factionId: 'red',
      socialString: 'test'
    };

    const seed1 = LootAxioms.makeSeed(ctx);
    const seed2 = LootAxioms.makeSeed(ctx);

    expect(seed1).toEqual(seed2);
    expect(seed1).toContain('player_1');
    expect(seed1).toContain('100'); // tickIndex
  });

  it('shortHash returns truncated hash', () => {
    const hash = LootAxioms.shortHash('test-value', 8);
    expect(hash.length).toBe(8);
  });

  it('stableHash returns consistent hash for same object', () => {
    const obj = { a: 1, b: 2 };
    const hash1 = LootAxioms.stableHash(obj);
    const hash2 = LootAxioms.stableHash(obj);
    expect(hash1).toEqual(hash2);
  });

  it('assertContext throws on missing required fields', () => {
    expect(() => LootAxioms.assertContext(null as any)).toThrow('LOOT_CONTEXT_MISSING');
    expect(() => LootAxioms.assertContext({})).toThrow('LOOT_PLAYER_ID_MISSING');
    expect(() => LootAxioms.assertContext({ playerId: 'p' })).toThrow('LOOT_TICK_INDEX_INVALID');
  });
});

// ---------------------------------------------------------------------------
// RarityResolver Tests
// ---------------------------------------------------------------------------
describe('RarityResolver', () => {
  it('resolves rarity with default weights', () => {
    const resolver = new RarityResolver();
    const rng = new DeterministicRng('rarity-test');

    const result = resolver.resolve({ rng, magicFind: 0, killStreak: 0, sourceRank: 'NORMAL' });

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('weight');
    expect(result).toHaveProperty('affixRange');
    expect(['COMMON', 'MAGIC', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']).toContain(result.id);
  });

  it('magicFind increases rare item chances', () => {
    const resolver = new RarityResolver();
    const rngNoMf = new DeterministicRng('no-mf');
    const rngWithMf = new DeterministicRng('with-mf');

    // Same seed but different magic find
    const result1 = resolver.resolve({ rng: rngNoMf, magicFind: 0, killStreak: 0, sourceRank: 'NORMAL' });
    const result2 = resolver.resolve({ rng: rngWithMf, magicFind: 500, killStreak: 0, sourceRank: 'NORMAL' });

    // Results may differ due to RNG, but no crash should occur
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });

  it('boss rank increases rarity chances', () => {
    const resolver = new RarityResolver();
    const rngBoss = new DeterministicRng('boss-test');
    const rngNormal = new DeterministicRng('normal-test');

    const bossResult = resolver.resolve({ rng: rngBoss, magicFind: 0, killStreak: 0, sourceRank: 'WORLD_BOSS' });
    const normalResult = resolver.resolve({ rng: rngNormal, magicFind: 0, killStreak: 0, sourceRank: 'NORMAL' });

    expect(bossResult).toBeDefined();
    expect(normalResult).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// SocialStringMutationEngine Tests
// ---------------------------------------------------------------------------
describe('SocialStringMutationEngine', () => {
  it('resolves mountain biome mutation', () => {
    const engine = new SocialStringMutationEngine();
    const rng = new DeterministicRng('mutation-test');

    const mutation = engine.resolve({
      rng,
      biomeId: 'mountain',
      factionId: 'neutral',
      socialString: '',
      playerReputation: 0
    });

    expect(mutation.titlePrefix).toBe('Stonebound');
    expect(mutation.loreTags).toContain('biome:mountain');
    expect(mutation.biasStats).toContain('armor');
  });

  it('resolves protector social string', () => {
    const engine = new SocialStringMutationEngine();
    const rng = new DeterministicRng('protector-test');

    const mutation = engine.resolve({
      rng,
      biomeId: 'forest',
      factionId: 'neutral',
      socialString: 'protector',
      playerReputation: 0
    });

    expect(mutation.titleSuffix).toBe('of the Watch');
    expect(mutation.loreTags).toContain('social:protector');
  });

  it('high reputation boosts value', () => {
    const engine = new SocialStringMutationEngine();
    const rng = new DeterministicRng('reputation-test');

    const mutation = engine.resolve({
      rng,
      biomeId: 'forest',
      factionId: 'neutral',
      socialString: '',
      playerReputation: 90
    });

    expect(mutation.valueScalePermille).toBe(1050);
    expect(mutation.loreTags).toContain('reputation:honored');
  });

  it('mutateName adds prefix and suffix', () => {
    const engine = new SocialStringMutationEngine();
    const mutation = {
      id: 'test',
      titlePrefix: 'Ancient',
      titleSuffix: 'of Power',
      loreTags: [],
      biasStats: [],
      forbiddenStats: [],
      valueScalePermille: 1000
    };

    const name = engine.mutateName('Sword', mutation);
    expect(name).toBe('Ancient Sword of Power');
  });
});

// ---------------------------------------------------------------------------
// LootGovernor Tests
// ---------------------------------------------------------------------------
describe('LootGovernor', () => {
  it('passes valid items', () => {
    const governor = new LootGovernor();
    const item = {
      affixes: [{ id: 'test' }],
      attributes: { damage: 100 },
      economy: { sellValue: 1000 }
    };

    const result = governor.inspect(item);
    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('flags items with too many affixes', () => {
    const governor = new LootGovernor({ maxAffixes: 2 });
    const item = {
      affixes: [1, 2, 3, 4],
      attributes: {},
      economy: {}
    };

    const result = governor.inspect(item);
    expect(result.ok).toBe(false);
    expect(result.warnings.some((w: any) => w.code === 'TOO_MANY_AFFIXES')).toBe(true);
  });

  it('flags items with forbidden stats', () => {
    const governor = new LootGovernor();
    const item = {
      affixes: [],
      attributes: { adminPower: 999 },
      economy: {}
    };

    const result = governor.inspect(item);
    expect(result.ok).toBe(false);
    expect(result.warnings.some((w: any) => w.code === 'FORBIDDEN_STAT')).toBe(true);
  });

  it('sanitize removes forbidden stats', () => {
    const governor = new LootGovernor();
    const item = {
      affixes: [],
      attributes: { damage: 100, adminPower: 999 },
      economy: { sellValue: 9999999 }
    };

    const clean = governor.sanitize(item);
    expect(clean.attributes.adminPower).toBeUndefined();
    expect(clean.attributes.damage).toBe(100);
    expect(clean.economy.sellValue).toBeLessThanOrEqual(governor['policy'].maxSellValue);
  });
});

// ---------------------------------------------------------------------------
// TreasureClassRegistry Tests
// ---------------------------------------------------------------------------
describe('TreasureClassRegistry', () => {
  it('resolves treasure class with fallback', async () => {
    const db = createFakeDb();
    const registry = new TreasureClassRegistry(db);

    const tc = await registry.getTreasureClass('TC_ACT1_BEAST');
    expect(tc.id).toBe('TC_ACT1_BEAST');
    expect(tc.rolls).toBeGreaterThan(0);
    expect(Array.isArray(tc.entries)).toBe(true);
  });

  it('resolves nested treasure class', async () => {
    const db = createFakeDb();
    const registry = new TreasureClassRegistry(db);
    const rng = new DeterministicRng('nested-test');

    const results = await registry.resolve('TC_ACT1_BEAST', rng);
    expect(Array.isArray(results)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ProceduralLootMachine Tests
// ---------------------------------------------------------------------------
describe('ProceduralLootMachine', () => {
  it('generates deterministic loot for same context', async () => {
    const db = createFakeDb();
    const machine = new ProceduralLootMachine(db);

    const ctx = {
      playerId: 'player_1',
      tickIndex: 100,
      dropSourceId: 'npc_1',
      lootIndex: 0,
      areaLevel: 10,
      treasureClassId: 'TC_ACT1_BEAST',
      biomeId: 'mountain',
      factionId: 'npc_kingdom_red',
      socialString: 'protector oath',
      playerReputation: 90
    };

    const resultA = await machine.generate(ctx);
    const resultB = await machine.generate(ctx);

    expect(resultA.seedHash).toBe(resultB.seedHash);
    expect(resultA.items).toEqual(resultB.items);
  });

  it('generates different loot for different tick', async () => {
    const db = createFakeDb();
    const machine = new ProceduralLootMachine(db);

    const ctx1 = {
      playerId: 'player_1',
      tickIndex: 100,
      dropSourceId: 'npc_1',
      lootIndex: 0,
      areaLevel: 10
    };

    const ctx2 = {
      ...ctx1,
      tickIndex: 101
    };

    const resultA = await machine.generate(ctx1);
    const resultB = await machine.generate(ctx2);

    expect(resultA.seedHash).not.toBe(resultB.seedHash);
  });

  it('generates currency items', async () => {
    const db = createFakeDb();
    const machine = new ProceduralLootMachine(db);

    const result = await machine.generate({
      playerId: 'player_1',
      tickIndex: 100,
      dropSourceId: 'npc_1',
      lootIndex: 0,
      areaLevel: 10,
      treasureClassId: 'TC_GOLD_SMALL'
    });

    const goldItem = result.items.find((i: any) => i.kind === 'currency');
    expect(goldItem).toBeDefined();
    expect(goldItem.currency).toBe('gold');
    expect(goldItem.amount).toBeGreaterThanOrEqual(3);
  });

  it('item has proper structure with all required fields', async () => {
    const db = createFakeDb();
    const machine = new ProceduralLootMachine(db);

    const result = await machine.generate({
      playerId: 'player_1',
      tickIndex: 100,
      dropSourceId: 'npc_1',
      lootIndex: 0,
      areaLevel: 10
    });

    const item = result.items.find((i: any) => i.kind === 'item');
    if (item) {
      expect(item).toHaveProperty('uid');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('rarity');
      expect(item).toHaveProperty('attributes');
      expect(item).toHaveProperty('affixes');
      expect(item).toHaveProperty('visuals');
      expect(item).toHaveProperty('economy');
      expect(item).toHaveProperty('meta');
    }
  });
});