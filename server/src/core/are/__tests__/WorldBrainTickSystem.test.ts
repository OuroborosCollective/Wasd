/**
 * WorldBrainTickSystem Tests
 *
 * Verifies:
 * - world-brain executes after npc-memory-rumor and before snapshot-composer
 * - conservation remains constant
 * - chunk order is stable
 * - snapshot sink is fed
 * - replay sink receives delta
 * - scheduler uses logical steps rather than wall-clock timers
 */

import { describe, it, expect } from 'vitest';
import {
  WorldBrainTickSystem,
  SnapshotComposerWorldBrainSink,
  InMemoryWorldBrainReplaySink,
  registerWorldBrainTickSystem,
  createWorldBrainTickSystemDescriptor,
  WORLD_BRAIN_TICK_PRIORITY,
  WORLD_BRAIN_TICK_SYSTEM_NAME,
} from '../WorldBrainTickSystem.js';
import type {
  WorldBrainCanonicalStatePort,
  WorldBrainDelta,
} from '../WorldBrainTickSystem.js';
import {
  WORLD_TICK_RECOMMENDED_PRIORITIES,
  WorldTickScheduler,
} from '../WorldTickScheduler.js';
import { TickSystemPriority, type TickSystem, type TickSystemContext } from '../TickSystem.js';
import { TickSystemRegistry } from '../TickSystemRegistry.js';
import { SnapshotComposer } from '../SnapshotComposer.js';
import {
  createEmptyIARELogicLayers,
  type IARELogicLayers,
} from '../IARELogicLayers.js';
import {
  createStateHash,
  createTickId,
  type ChunkKey,
  type KappaInt,
} from '../types.js';

function k(value: number): KappaInt {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Invalid test KappaInt: ${value}`);
  }

  return value as KappaInt;
}

function ck(value: `${number}:${number}`): ChunkKey {
  return value as ChunkKey;
}

function createLayers(overrides: Partial<Record<keyof IARELogicLayers, number>> = {}): IARELogicLayers {
  const base = createEmptyIARELogicLayers();

  return Object.freeze({
    ...base,
    ...Object.fromEntries(
      Object.entries(overrides).map(([key, value]) => [key, k(value)]),
    ),
  }) as IARELogicLayers;
}

function createStableLayers(): IARELogicLayers {
  return createLayers({
    ecology: 500,
    market: 500,
    physiology: 500,
    trade: 500,
    memory: 500,
    politics: 500,
    conflict: 500,
    economy: 500,
    kingdoms: 500,
    faith: 500,
    dungeon: 500,
    fear: 500,
    cycles: 500,
  });
}

function createMockStatePort(
  chunks: readonly { readonly key: ChunkKey; readonly layers: IARELogicLayers }[],
): WorldBrainCanonicalStatePort {
  const chunkMap = new Map<ChunkKey, IARELogicLayers>(
    chunks.map((chunk) => [chunk.key, chunk.layers]),
  );

  return {
    listActiveChunkKeys(): readonly ChunkKey[] {
      return Object.freeze([...chunkMap.keys()]);
    },
    readChunkLayers(chunkKey: ChunkKey): IARELogicLayers | null {
      return chunkMap.get(chunkKey) ?? null;
    },
    commitWorldBrainDelta(delta: WorldBrainDelta): void {
      chunkMap.set(delta.chunkKey, delta.nextLayers);
    },
  };
}

function createWorldBrainHarness(chunks: readonly { readonly key: ChunkKey; readonly layers: IARELogicLayers }[]) {
  const state = createMockStatePort(chunks);
  const replay = new InMemoryWorldBrainReplaySink();
  const composer = new SnapshotComposer();
  const snapshot = new SnapshotComposerWorldBrainSink(composer);
  const system = new WorldBrainTickSystem({ state, snapshot, replay });

  return { state, replay, composer, snapshot, system };
}

function createContext(tick: number): TickSystemContext {
  return Object.freeze({
    tickCount: createTickId(tick),
    isHighFrequencyTick: true,
  });
}

function createNoopSystem(name: string, priority: TickSystemPriority, record: string[]): TickSystem {
  return {
    name,
    priority,
    enabled: true,
    tick(): void {
      record.push(name);
    },
  };
}

describe('WorldBrainTickSystem', () => {
  describe('priority and descriptor', () => {
    it('has priority 25 between GAMEPLAY=20 and BROADCAST=30', () => {
      expect(WORLD_BRAIN_TICK_PRIORITY).toBe(25);
      expect(TickSystemPriority.GAMEPLAY).toBe(20);
      expect(TickSystemPriority.BROADCAST).toBe(30);
      expect(WORLD_BRAIN_TICK_PRIORITY).toBeGreaterThan(TickSystemPriority.GAMEPLAY);
      expect(WORLD_BRAIN_TICK_PRIORITY).toBeLessThan(TickSystemPriority.BROADCAST);
    });

    it('uses the canonical world-brain system name', () => {
      expect(WORLD_BRAIN_TICK_SYSTEM_NAME).toBe('world-brain');
    });

    it('creates a descriptor with explicit scheduler dependencies', () => {
      const { system } = createWorldBrainHarness([]);
      const descriptor = createWorldBrainTickSystemDescriptor(system);

      expect(descriptor.system).toBe(system);
      expect(descriptor.dependencies).toEqual([
        'input',
        'spatial-interest',
        'resource-economy',
        'npc-memory-rumor',
      ]);
      expect(descriptor.tags).toContain('snapshot-source');
    });
  });

  describe('construction and registry integration', () => {
    it('creates a system with all required ports', () => {
      const { system } = createWorldBrainHarness([]);

      expect(system.name).toBe('world-brain');
      expect(system.priority).toBe(25);
      expect(system.enabled).toBe(true);
    });

    it('defaults to enabled=true', () => {
      const state = createMockStatePort([]);
      const replay = new InMemoryWorldBrainReplaySink();
      const composer = new SnapshotComposer();

      const system = new WorldBrainTickSystem({
        state,
        snapshot: new SnapshotComposerWorldBrainSink(composer),
        replay,
      });

      expect(system.enabled).toBe(true);
    });

    it('registers with a provided registry without touching the global registry', () => {
      const registry = new TickSystemRegistry();
      const state = createMockStatePort([]);
      const replay = new InMemoryWorldBrainReplaySink();
      const composer = new SnapshotComposer();

      const system = registerWorldBrainTickSystem(
        {
          state,
          snapshot: new SnapshotComposerWorldBrainSink(composer),
          replay,
        },
        registry,
      );

      expect(registry.get('world-brain')).toBe(system);
      expect(registry.getStats().totalSystems).toBe(1);
    });
  });

  describe('tick execution', () => {
    it('processes active chunks in stable sorted order', () => {
      const { replay, system } = createWorldBrainHarness([
        { key: ck('5:3'), layers: createLayers({ ecology: 500 }) },
        { key: ck('1:1'), layers: createLayers({ trade: 600 }) },
        { key: ck('10:2'), layers: createLayers({ conflict: 400 }) },
      ]);

      system.tick(createContext(1));

      const deltas = replay.snapshot();
      expect(deltas).toHaveLength(3);
      expect(deltas.map((delta) => String(delta.chunkKey))).toEqual(['1:1', '5:3', '10:2']);
    });

    it('emits deterministic deltas with hashes and conservation checksums', () => {
      const { replay, system } = createWorldBrainHarness([
        { key: ck('0:0'), layers: createLayers({ ecology: 300 }) },
      ]);

      system.tick(createContext(42));

      const deltas = replay.snapshot();
      expect(deltas).toHaveLength(1);

      const delta = deltas[0];
      expect(delta.tick).toBe(42);
      expect(String(delta.chunkKey)).toBe('0:0');
      expect(delta.previousHash).toMatch(/^[0-9a-f]{64}$/);
      expect(delta.nextHash).toMatch(/^[0-9a-f]{64}$/);
      expect(delta.attractor).toBeDefined();
      expect(delta.checksumBefore).toBe(delta.checksumAfter);
    });
  });

  describe('conservation law', () => {
    it('maintains layer sum constant without creating value', () => {
      const { replay, system } = createWorldBrainHarness([
        {
          key: ck('0:0'),
          layers: createLayers({
            ecology: 200,
            market: 300,
            physiology: 150,
            trade: 100,
            memory: 50,
            politics: 80,
            conflict: 60,
            economy: 40,
            kingdoms: 10,
            faith: 5,
            dungeon: 3,
            fear: 1,
            cycles: 1,
          }),
        },
      ]);

      system.tick(createContext(1));

      const deltas = replay.snapshot();
      expect(deltas).toHaveLength(1);
      expect(deltas[0].checksumBefore).toBe(deltas[0].checksumAfter);
    });

    it('does not throw for empty canonical state', () => {
      const { system } = createWorldBrainHarness([
        { key: ck('0:0'), layers: createLayers() },
      ]);

      expect(() => system.tick(createContext(1))).not.toThrow();
    });
  });

  describe('replay and snapshot sinks', () => {
    it('records deltas for replay', () => {
      const { replay, system } = createWorldBrainHarness([
        { key: ck('1:1'), layers: createLayers({ trade: 600 }) },
        { key: ck('2:2'), layers: createLayers({ faith: 700 }) },
      ]);

      system.tick(createContext(1));

      expect(replay.snapshot()).toHaveLength(2);
      expect(replay.latest()).not.toBeNull();
      expect(replay.latest()?.chunkKey).toBeDefined();
    });

    it('feeds the SnapshotComposer sink', () => {
      const { composer, system } = createWorldBrainHarness([
        { key: ck('3:7'), layers: createLayers({ ecology: 400 }) },
      ]);

      system.tick(createContext(5));

      expect(composer.getChunkCount()).toBe(1);
      expect(composer.getChunkSnapshot(ck('3:7'))).toBeDefined();
    });
  });

  describe('attractor selection', () => {
    it('selects VILLAGE_TO_CITY when trade is dominant and >= 800', () => {
      const { replay, system } = createWorldBrainHarness([
        { key: ck('0:0'), layers: createLayers({ trade: 850 }) },
      ]);

      system.tick(createContext(1));

      expect(replay.latest()?.attractor.type).toBe('village_to_city');
    });

    it('selects AGGRESSION_SPIKE when conflict is dominant and >= 750', () => {
      const { replay, system } = createWorldBrainHarness([
        { key: ck('0:0'), layers: createLayers({ conflict: 780 }) },
      ]);

      system.tick(createContext(1));

      expect(replay.latest()?.attractor.type).toBe('aggression_spike');
    });

    it('selects MARKET_COLLAPSE when market is dominant and <= 200', () => {
      const { replay, system } = createWorldBrainHarness([
        { key: ck('0:0'), layers: createLayers({ market: 150 }) },
      ]);

      system.tick(createContext(1));

      expect(replay.latest()?.attractor.type).toBe('market_collapse');
    });

    it('selects CULT_FORMATION when faith is dominant and >= 700', () => {
      const { replay, system } = createWorldBrainHarness([
        { key: ck('0:0'), layers: createLayers({ faith: 720 }) },
      ]);

      system.tick(createContext(1));

      expect(replay.latest()?.attractor.type).toBe('cult_formation');
    });

    it('selects DUNGEON_EMERGENCE when dungeon is dominant and >= 800', () => {
      const { replay, system } = createWorldBrainHarness([
        { key: ck('0:0'), layers: createLayers({ dungeon: 850 }) },
      ]);

      system.tick(createContext(1));

      expect(replay.latest()?.attractor.type).toBe('dungeon_emergence');
    });

    it('selects EMERGING when layer field is unbalanced but no hard threshold wins', () => {
      const { replay, system } = createWorldBrainHarness([
        { key: ck('0:0'), layers: createLayers({ ecology: 500 }) },
      ]);

      system.tick(createContext(1));

      expect(replay.latest()?.attractor.type).toBe('emerging');
    });

    it('selects STABLE when all layers are balanced near the convergence center', () => {
      const { replay, system } = createWorldBrainHarness([
        { key: ck('0:0'), layers: createStableLayers() },
      ]);

      system.tick(createContext(1));

      expect(replay.latest()?.attractor.type).toBe('stable');
    });
  });

  describe('InMemoryWorldBrainReplaySink', () => {
    it('records and retrieves deltas', () => {
      const sink = new InMemoryWorldBrainReplaySink();

      const delta: WorldBrainDelta = {
        tick: createTickId(1),
        chunkKey: ck('1:1'),
        previousHash: createStateHash('0'.repeat(64)),
        nextHash: createStateHash('1'.repeat(64)),
        checksumBefore: k(100),
        checksumAfter: k(100),
        previousLayers: createLayers(),
        nextLayers: createLayers(),
        attractor: {
          type: 'stable',
          primaryLayer: 'ecology',
          strength: k(500),
          convergence: k(950),
        },
      };

      sink.recordWorldBrainDelta(delta);

      expect(sink.snapshot()).toHaveLength(1);
      expect(sink.latest()).toBe(delta);
    });

    it('returns null for latest when empty', () => {
      const sink = new InMemoryWorldBrainReplaySink();
      expect(sink.latest()).toBeNull();
    });

    it('returns immutable snapshot copies', () => {
      const sink = new InMemoryWorldBrainReplaySink();
      const snap1 = sink.snapshot();

      const delta: WorldBrainDelta = {
        tick: createTickId(1),
        chunkKey: ck('1:1'),
        previousHash: createStateHash('0'.repeat(64)),
        nextHash: createStateHash('1'.repeat(64)),
        checksumBefore: k(100),
        checksumAfter: k(100),
        previousLayers: createLayers(),
        nextLayers: createLayers(),
        attractor: {
          type: 'stable',
          primaryLayer: 'ecology',
          strength: k(500),
          convergence: k(950),
        },
      };

      sink.recordWorldBrainDelta(delta);
      const snap2 = sink.snapshot();

      expect(snap1).toHaveLength(0);
      expect(snap2).toHaveLength(1);
    });
  });

  describe('WorldTickScheduler', () => {
    it('executes the required systems in deterministic manifest order', () => {
      const registry = new TickSystemRegistry();
      const executed: string[] = [];

      registry.register({
        system: createNoopSystem('snapshot-composer', WORLD_TICK_RECOMMENDED_PRIORITIES.snapshotComposer, executed),
        dependencies: ['world-brain'],
        tags: ['snapshot'],
      });
      registry.register({
        system: createNoopSystem('input', WORLD_TICK_RECOMMENDED_PRIORITIES.input, executed),
        dependencies: [],
        tags: ['input'],
      });
      registry.register({
        system: createNoopSystem('resource-economy', WORLD_TICK_RECOMMENDED_PRIORITIES.resourceEconomy, executed),
        dependencies: ['spatial-interest'],
        tags: ['economy'],
      });
      registry.register({
        system: createNoopSystem('world-brain', WORLD_TICK_RECOMMENDED_PRIORITIES.worldBrain, executed),
        dependencies: ['npc-memory-rumor'],
        tags: ['world-brain'],
      });
      registry.register({
        system: createNoopSystem('spatial-interest', WORLD_TICK_RECOMMENDED_PRIORITIES.spatialInterest, executed),
        dependencies: ['input'],
        tags: ['spatial'],
      });
      registry.register({
        system: createNoopSystem('npc-memory-rumor', WORLD_TICK_RECOMMENDED_PRIORITIES.npcMemoryRumor, executed),
        dependencies: ['resource-economy'],
        tags: ['npc'],
      });

      const scheduler = new WorldTickScheduler({ registry });
      const result = scheduler.step();

      expect(result.tick).toBe(1);
      expect(result.executedSystems).toEqual([
        'input',
        'spatial-interest',
        'resource-economy',
        'npc-memory-rumor',
        'world-brain',
        'snapshot-composer',
      ]);
      expect(executed).toEqual(result.executedSystems);
    });

    it('runs multiple logical ticks without owning wall-clock pacing', () => {
      const registry = new TickSystemRegistry();
      const executed: string[] = [];

      registry.register({ system: createNoopSystem('input', WORLD_TICK_RECOMMENDED_PRIORITIES.input, executed), dependencies: [], tags: [] });
      registry.register({ system: createNoopSystem('spatial-interest', WORLD_TICK_RECOMMENDED_PRIORITIES.spatialInterest, executed), dependencies: [], tags: [] });
      registry.register({ system: createNoopSystem('resource-economy', WORLD_TICK_RECOMMENDED_PRIORITIES.resourceEconomy, executed), dependencies: [], tags: [] });
      registry.register({ system: createNoopSystem('npc-memory-rumor', WORLD_TICK_RECOMMENDED_PRIORITIES.npcMemoryRumor, executed), dependencies: [], tags: [] });
      registry.register({ system: createNoopSystem('world-brain', WORLD_TICK_RECOMMENDED_PRIORITIES.worldBrain, executed), dependencies: [], tags: [] });
      registry.register({ system: createNoopSystem('snapshot-composer', WORLD_TICK_RECOMMENDED_PRIORITIES.snapshotComposer, executed), dependencies: [], tags: [] });

      const scheduler = new WorldTickScheduler({ registry });
      const results = scheduler.runTicks(3);

      expect(results.map((result) => result.tick)).toEqual([1, 2, 3]);
      expect(executed).toHaveLength(18);
    });
  });
});
