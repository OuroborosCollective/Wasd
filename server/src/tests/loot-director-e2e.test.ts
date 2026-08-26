import { describe, expect, it, vi } from 'vitest';
import { GameEventBus } from '../core/events/GameEventBus.js';
import { RuntimeHistoryLog } from '../history/RuntimeHistoryLog.js';
import { InventoryPersistenceAdapter, PersistedPlayerInventoryState, createPersistedPlayerInventoryState } from '../inventory/InventoryPersistence.js';
import { InventoryService } from '../inventory/InventoryService.js';
import { InventoryStore } from '../inventory/InventoryStore.js';
import { LootDirector, LootDelta, LootRollContextCanonical } from '../loot/LootDirector.js';

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

class InMemoryWorldDropService {
  readonly deltas: LootDelta[] = [];

  async spawnItem({ delta }: { delta: LootDelta }): Promise<void> {
    this.deltas.push(delta);
  }
}

function createDeterministicLootCatalog(itemId = 'wood_log') {
  return {
    models: {
      LootPolicy: {
        async findOne() {
          return { version: 'test-loot-policy-v1', config: { minAreaLevel: 1, maxAreaLevel: 100, maxMagicFind: 500 } };
        },
      },
      TreasureClass: {
        async findOne({ id }: { id: string }) {
          if (id !== 'TC_TEST_INVENTORY') return null;
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
            id: itemId,
            name: itemId,
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

function createContext(): LootRollContextCanonical {
  return {
    sourceEntityId: 'player_loot_e2e',
    defeatedEntityId: 'npc_loot_e2e',
    actorId: 'player_loot_e2e',
    sourceTick: 420,
    chunkKey: '7:9',
    worldHash: 'world:live-e2e',
    chunkHash: 'chunk:7:9:hash',
    kappa: 'kappa:7000:9000',
    lootIndex: 0,
    treasureClassId: 'TC_TEST_INVENTORY',
    areaLevel: 10,
    sourceRank: 'NORMAL',
    biomeId: 'forest',
    factionId: 'neutral',
    socialString: '',
  };
}

function waitForLootDelta(eventBus: GameEventBus): Promise<LootDelta> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('loot_delta_timeout')), 1000);
    eventBus.onSafe('loot.delta', async ({ delta }: { delta: LootDelta }) => {
      clearTimeout(timeout);
      resolve(delta);
    });
  });
}

describe('LootDirector canonical E2E', () => {
  it('consumes one confirmed defeat into persistent inventory and suppresses restart replay', async () => {
    const persistence = new MemoryInventoryPersistence();
    const eventBus = new GameEventBus();
    const inventory = new InventoryService(new InventoryStore(), persistence);
    const director = new LootDirector({
      db: createDeterministicLootCatalog(),
      eventBus,
      inventoryService: inventory,
      auditStore: new RuntimeHistoryLog(),
    });
    director.start();

    const emitted = waitForLootDelta(eventBus);
    eventBus.emitSafe('combat.defeat', createContext());
    const delta = await emitted;

    expect(delta.lootRollContext).toMatchObject({
      sourceTick: 420,
      chunkKey: '7:9',
      worldHash: 'world:live-e2e',
      chunkHash: 'chunk:7:9:hash',
      kappa: 'kappa:7000:9000',
    });
    expect(delta.items).toHaveLength(1);
    expect(delta.items[0]?.itemId).toBe('wood_log');
    expect((await inventory.getPlayerInventory('player_loot_e2e')).slots).toEqual([
      expect.objectContaining({ itemId: 'wood_log', quantity: 1 }),
    ]);
    expect(inventory.getAppliedOriginUids('player_loot_e2e')).toEqual([delta.items[0]?.uid]);

    const restartedInventory = new InventoryService(new InventoryStore(), persistence);
    const replayDirector = new LootDirector({
      db: createDeterministicLootCatalog(),
      eventBus: new GameEventBus(),
      inventoryService: restartedInventory,
    });
    const replay = await replayDirector.handleDefeatEvent(createContext());

    expect(replay).toBeNull();
    expect((await restartedInventory.getPlayerInventory('player_loot_e2e')).slots).toEqual([
      expect.objectContaining({ itemId: 'wood_log', quantity: 1 }),
    ]);
  });

  it('routes a fully rejected inventory delta to the concrete server-owned world-drop consumer', async () => {
    const persistence = new MemoryInventoryPersistence();
    const inventory = new InventoryService(new InventoryStore(), persistence);
    const worldDrops = new InMemoryWorldDropService();
    const director = new LootDirector({
      db: createDeterministicLootCatalog('lineage_relic'),
      eventBus: new GameEventBus(),
      inventoryService: inventory,
      worldDropService: worldDrops,
    });

    const delta = await director.handleDefeatEvent(createContext());

    expect(delta?.items).toHaveLength(1);
    expect((await inventory.getPlayerInventory('player_loot_e2e')).slots).toEqual([]);
    expect(worldDrops.deltas).toEqual([delta]);
  });
});

class DeferredWorldDropService {
  readonly payloads: unknown[] = [];
  private releaseSpawn: (() => void) | null = null;
  private readonly firstSpawnPromise: Promise<void>;

  constructor() {
    this.firstSpawnPromise = new Promise((resolve) => {
      this.releaseSpawn = resolve;
    });
  }

  async spawnItem(payload: unknown): Promise<void> {
    this.payloads.push(payload);
    await this.firstSpawnPromise;
  }

  release(): void {
    this.releaseSpawn?.();
  }

  async waitForFirstSpawn(): Promise<void> {
    for (let attempt = 0; attempt < 50; attempt++) {
      if (this.payloads.length > 0) return;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    throw new Error('world-drop consumer was not reached');
  }
}

describe('LootDirector edge-case regressions', () => {
  it('reserves an in-flight defeat before an async world-drop consumer can admit a duplicate', async () => {
    const worldDrops = new DeferredWorldDropService();
    const director = new LootDirector({
      db: createDeterministicLootCatalog(),
      eventBus: new GameEventBus(),
      worldDropService: worldDrops,
    });

    const first = director.handleDefeatEvent(createContext());
    await worldDrops.waitForFirstSpawn();

    const duplicate = await director.handleDefeatEvent(createContext());
    expect(duplicate).toBeNull();

    worldDrops.release();
    const delta = await first;

    expect(delta?.items).toHaveLength(1);
    expect(worldDrops.payloads).toHaveLength(1);
    expect(director.getStatus().telemetry.idempotencyHits).toBe(1);
  });

  it('keeps the committed inventory delta and downstream event truthful when audit recording fails', async () => {
    const persistence = new MemoryInventoryPersistence();
    const inventory = new InventoryService(new InventoryStore(), persistence);
    const eventBus = new GameEventBus();
    const emitted: LootDelta[] = [];
    eventBus.onSafe('loot.delta', async ({ delta }: { delta: LootDelta }) => {
      emitted.push(delta);
    });
    const auditStore = {
      recordDrop: vi.fn().mockRejectedValue(new Error('audit_store_unavailable')),
    };
    const director = new LootDirector({
      db: createDeterministicLootCatalog(),
      eventBus,
      inventoryService: inventory,
      auditStore,
    });

    const delta = await director.handleDefeatEvent(createContext());

    expect(delta?.items).toHaveLength(1);
    expect((await inventory.getPlayerInventory('player_loot_e2e')).slots).toEqual([
      expect.objectContaining({ itemId: 'wood_log', quantity: 1 }),
    ]);
    expect(emitted).toEqual([delta]);
    expect(auditStore.recordDrop).toHaveBeenCalledTimes(1);
    expect(director.getStatus().telemetry.auditFailures).toBe(1);
    expect(director.getStatus().telemetry.failedRolls).toBe(0);
  });

  it('releases an in-flight reservation after a policy-load failure so a deterministic retry can succeed', async () => {
    const db = createDeterministicLootCatalog();
    let failPolicyLoad = true;
    db.models.LootPolicy.findOne = async () => {
      if (failPolicyLoad) {
        failPolicyLoad = false;
        throw new Error('policy_store_temporarily_unavailable');
      }
      return { version: 'test-loot-policy-v1', config: { minAreaLevel: 1, maxAreaLevel: 100, maxMagicFind: 500 } };
    };
    const worldDrops = new InMemoryWorldDropService();
    const director = new LootDirector({
      db,
      eventBus: new GameEventBus(),
      worldDropService: worldDrops,
    });

    expect(await director.handleDefeatEvent(createContext())).toBeNull();

    const retry = await director.handleDefeatEvent(createContext());
    expect(retry?.items).toHaveLength(1);
    expect(worldDrops.deltas).toEqual([retry]);
  });

  it('does not emit a loot success when neither inventory nor a world-drop consumer is available', async () => {
    const eventBus = new GameEventBus();
    const emitted: LootDelta[] = [];
    eventBus.onSafe('loot.delta', async ({ delta }: { delta: LootDelta }) => {
      emitted.push(delta);
    });
    const director = new LootDirector({
      db: createDeterministicLootCatalog(),
      eventBus,
    });

    expect(await director.handleDefeatEvent(createContext())).toBeNull();
    expect(emitted).toEqual([]);
    expect(director.getStatus().telemetry.noConsumerDeltas).toBe(1);
  });
});
