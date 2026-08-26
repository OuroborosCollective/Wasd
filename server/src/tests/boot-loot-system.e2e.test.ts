import { afterEach, describe, expect, it } from 'vitest';
import {
  bootLootSystem,
  emitNpcKilledLootEvent,
  resetLootSystemForTests,
} from '../bootLootSystem.js';
import { InventoryPersistenceAdapter, PersistedPlayerInventoryState, createPersistedPlayerInventoryState } from '../inventory/InventoryPersistence.js';
import { InventoryService } from '../inventory/InventoryService.js';
import { InventoryStore } from '../inventory/InventoryStore.js';
import type { LootDelta } from '../loot/LootDelta.js';

class MemoryInventoryPersistence implements InventoryPersistenceAdapter {
  private readonly states = new Map<string, PersistedPlayerInventoryState>();

  async loadPlayerInventory(playerId: string): Promise<PersistedPlayerInventoryState | null> {
    const state = this.states.get(playerId);
    return state
      ? createPersistedPlayerInventoryState(state.playerId, state, state.appliedOriginUids)
      : null;
  }

  async savePlayerInventory(state: PersistedPlayerInventoryState): Promise<void> {
    this.states.set(
      state.playerId,
      createPersistedPlayerInventoryState(state.playerId, state, state.appliedOriginUids),
    );
  }
}

function createDeterministicLootCatalog() {
  return {
    models: {
      LootPolicy: {
        async findOne() {
          return { version: 'boot-e2e-policy-v1', config: { minAreaLevel: 1, maxAreaLevel: 100, maxMagicFind: 500 } };
        },
      },
      TreasureClass: {
        async findOne({ id }: { id: string }) {
          if (id !== 'TC_BOOT_E2E') return null;
          return {
            id,
            rolls: 1,
            noDropWeight: 0,
            entries: [{ type: 'baseType', id: 'resource.wood', weight: 1 }],
          };
        },
      },
      ItemBase: {
        async find() {
          return [{
            id: 'wood_log',
            name: 'Wood Log',
            type: 'resource.wood',
            minLevel: 1,
            maxLevel: 99,
            reqStr: 0,
            reqInt: 0,
            reqDex: 0,
            baseStats: {},
          }];
        },
      },
      AffixPool: {
        async find() {
          return [];
        },
      },
    },
  };
}

async function waitForDelta(deltas: readonly LootDelta[]): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (deltas.length > 0) return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error('loot_delta was not emitted through the booted runtime');
}

async function drainEventLoop(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
}

const confirmedKill = Object.freeze({
  player: {
    id: 'player_boot_e2e',
    stats: { magicFind: 17, killStreak: 3 },
  },
  npc: {
    id: 'npc_boot_e2e',
    rank: 'NORMAL',
    treasureClassId: 'TC_BOOT_E2E',
    position: { x: 130, y: 0, z: -70 },
    factionId: 'forest',
  },
  zone: {
    areaLevel: 12,
    biomeId: 'forest',
    factionId: 'wardens',
    chunkKey: '2:-2',
    chunkHash: 'chunk:2:-2:authoritative',
  },
  world: {
    worldHash: 'world:authoritative:boot-e2e',
    kappa: 'kappa:1000:boot-e2e',
  },
  tickIndex: 730,
});

describe('booted canonical NPC-defeat loot runtime', () => {
  afterEach(() => {
    resetLootSystemForTests();
  });

  it('projects one confirmed kill through canonical loot into a persistent inventory snapshot and suppresses its replay', async () => {
    const persistence = new MemoryInventoryPersistence();
    const inventory = new InventoryService(new InventoryStore(), persistence);
    const { eventBus } = bootLootSystem({
      db: createDeterministicLootCatalog(),
      inventoryService: inventory,
    });
    const deltas: LootDelta[] = [];
    eventBus.onSafe('loot.delta', async ({ delta }: { delta: LootDelta }) => {
      deltas.push(delta);
    });

    expect(emitNpcKilledLootEvent(confirmedKill)).toBe(true);
    await waitForDelta(deltas);

    const [delta] = deltas;
    expect(delta).toBeDefined();
    expect(delta?.lootRollContext).toMatchObject({
      sourceEntityId: 'player_boot_e2e',
      actorId: 'player_boot_e2e',
      defeatedEntityId: 'npc_boot_e2e',
      sourceTick: 730,
      chunkKey: '2:-2',
      worldHash: 'world:authoritative:boot-e2e',
      chunkHash: 'chunk:2:-2:authoritative',
      kappa: 'kappa:1000:boot-e2e',
      sourceRank: 'NORMAL',
      treasureClassId: 'TC_BOOT_E2E',
    });
    expect(delta?.seedHash).toEqual(expect.any(String));
    expect(delta?.items).toHaveLength(1);

    const snapshot = await inventory.getPlayerInventory('player_boot_e2e');
    expect(snapshot.slots).toEqual([
      expect.objectContaining({ itemId: 'wood_log', quantity: 1 }),
    ]);
    expect(inventory.getAppliedOriginUids('player_boot_e2e')).toEqual([delta?.items[0]?.uid]);

    expect(emitNpcKilledLootEvent(confirmedKill)).toBe(true);
    await drainEventLoop();

    expect(deltas).toHaveLength(1);
    expect((await inventory.getPlayerInventory('player_boot_e2e')).slots).toEqual(snapshot.slots);
  });

  it('rejects a confirmed kill without explicit deterministic world context before it can claim a loot result', async () => {
    const persistence = new MemoryInventoryPersistence();
    const inventory = new InventoryService(new InventoryStore(), persistence);
    const { eventBus } = bootLootSystem({
      db: createDeterministicLootCatalog(),
      inventoryService: inventory,
    });
    const deltas: LootDelta[] = [];
    eventBus.onSafe('loot.delta', async ({ delta }: { delta: LootDelta }) => {
      deltas.push(delta);
    });

    expect(emitNpcKilledLootEvent({
      ...confirmedKill,
      world: { worldHash: 'world:authoritative:missing-kappa' },
    })).toBe(false);
    await drainEventLoop();

    expect(deltas).toEqual([]);
    expect((await inventory.getPlayerInventory('player_boot_e2e')).slots).toEqual([]);
  });
});

describe('booted canonical NPC-defeat adapter validation regressions', () => {
  afterEach(() => {
    resetLootSystemForTests();
  });

  it('fails closed for each missing canonical identity, world, chunk, Kappa, tick, or spatial input', async () => {
    const persistence = new MemoryInventoryPersistence();
    const inventory = new InventoryService(new InventoryStore(), persistence);
    const { eventBus } = bootLootSystem({
      db: createDeterministicLootCatalog(),
      inventoryService: inventory,
    });
    const deltas: LootDelta[] = [];
    eventBus.onSafe('loot.delta', async ({ delta }: { delta: LootDelta }) => {
      deltas.push(delta);
    });

    const invalidDefeats = [
      { ...confirmedKill, player: { ...confirmedKill.player, id: ' ' } },
      { ...confirmedKill, npc: { ...confirmedKill.npc, id: '' } },
      { ...confirmedKill, world: { ...confirmedKill.world, worldHash: ' ' } },
      { ...confirmedKill, zone: { ...confirmedKill.zone, chunkHash: '' } },
      { ...confirmedKill, world: { ...confirmedKill.world, kappa: '' } },
      { ...confirmedKill, tickIndex: -1 },
      { ...confirmedKill, tickIndex: 1.5 },
      {
        ...confirmedKill,
        zone: { ...confirmedKill.zone, chunkKey: '' },
        npc: { ...confirmedKill.npc, position: { x: Number.NaN, y: 0, z: Number.POSITIVE_INFINITY } },
      },
    ];

    for (const defeat of invalidDefeats) {
      expect(emitNpcKilledLootEvent(defeat)).toBe(false);
    }
    await drainEventLoop();

    expect(deltas).toEqual([]);
    expect((await inventory.getPlayerInventory('player_boot_e2e')).slots).toEqual([]);
  });

  it('uses an explicit World-Boss fallback and a finite derived chunk key when optional values are absent', async () => {
    const persistence = new MemoryInventoryPersistence();
    const inventory = new InventoryService(new InventoryStore(), persistence);
    const { eventBus } = bootLootSystem({
      db: createDeterministicLootCatalog(),
      inventoryService: inventory,
    });
    const deltas: LootDelta[] = [];
    eventBus.onSafe('loot.delta', async ({ delta }: { delta: LootDelta }) => {
      deltas.push(delta);
    });

    expect(emitNpcKilledLootEvent({
      ...confirmedKill,
      npc: {
        ...confirmedKill.npc,
        rank: undefined,
        worldBoss: true,
        treasureClassId: 'TC_BOOT_E2E',
        position: { x: 130, y: 0, z: -70 },
      },
      zone: { ...confirmedKill.zone, chunkKey: undefined },
    })).toBe(true);
    await waitForDelta(deltas);

    expect(deltas[0]?.lootRollContext).toMatchObject({
      sourceRank: 'WORLD_BOSS',
      chunkKey: 'tile:2:-2',
    });
  });
});
