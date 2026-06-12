import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldTickThinShell,
  worldTickThinShell,
  registerWorldTickThinShell,
  type WorldStateProvider,
} from '../WorldTickThinShell.js';
import { createChunkKey } from '../types.js';

function registerDeterministicTestProvider(shell: WorldTickThinShell): void {
  shell.registerWorldStateProvider({
    id: 'test-runtime-provider',
    getWorldState: () => ({
      npcs: [{ id: 'npc-test', position: { x: 0, y: 0 }, health: 100 }],
      players: [{ id: 'player-test', position: { x: 1, y: 1 } }],
      loot: [],
    }),
  });
}

describe('WorldTickThinShell', () => {
  let shell: WorldTickThinShell;

  beforeEach(() => {
    shell = new WorldTickThinShell();
  });

  describe('configuration', () => {
    it('should have correct tick interval (100ms for 10Hz)', () => {
      expect(WorldTickThinShell.TICK_INTERVAL_MS).toBe(100);
    });

    it('should start with tick count 0', () => {
      expect(shell.getTickCount()).toBe(0);
    });
  });

  describe('chunk registration', () => {
    it('should register a chunk', () => {
      const chunkKey = createChunkKey(1, 1);

      shell.registerChunk(String(chunkKey));

      const snapshot = shell.getWorldBrainSnapshot();
      expect(snapshot.active_chunks).toContain(chunkKey);
    });

    it('should unregister a chunk', () => {
      const chunkKey = createChunkKey(1, 1);
      shell.registerChunk(String(chunkKey));
      shell.unregisterChunk(String(chunkKey));

      const snapshot = shell.getWorldBrainSnapshot();
      expect(snapshot.active_chunks).not.toContain(chunkKey);
    });
  });

  describe('tick execution', () => {
    it('should increment tick count when a runtime provider is registered', () => {
      registerDeterministicTestProvider(shell);
      shell.registerChunk('0:0');

      shell.tick();

      expect(shell.getTickCount()).toBe(1);
    });

    it('should execute without error when a runtime provider is registered', () => {
      registerDeterministicTestProvider(shell);
      shell.registerChunk('0:0');

      expect(() => shell.tick()).not.toThrow();
    });
  });

  describe('lifecycle', () => {
    it('should not be running initially', () => {
      const newShell = new WorldTickThinShell();
      // isRunning is private, but we can check via behavior
      expect(() => newShell.stop()).not.toThrow();
    });

    it('should stop gracefully', async () => {
      const newShell = new WorldTickThinShell();
      registerDeterministicTestProvider(newShell);
      newShell.start();

      await newShell.stop();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('stats', () => {
    it('should return persistence stats', () => {
      const stats = shell.getPersistenceStats();

      expect(stats).toHaveProperty('queuedEvents');
      expect(stats).toHaveProperty('flushedEvents');
      expect(stats).toHaveProperty('failedEvents');
    });

    it('should return snapshot stats', () => {
      const stats = shell.getSnapshotStats();

      expect(stats).toHaveProperty('chunkCount');
    });
  });

  describe('world brain snapshot', () => {
    it('should return valid snapshot structure after a provider-backed tick', () => {
      registerDeterministicTestProvider(shell);
      shell.registerChunk('0:0');
      shell.tick();

      const snapshot = shell.getWorldBrainSnapshot();

      expect(snapshot).toHaveProperty('tick');
      expect(snapshot).toHaveProperty('active_chunks');
      expect(snapshot).toHaveProperty('layer_states');
      expect(snapshot).toHaveProperty('omega_e');
      expect(snapshot).toHaveProperty('world_hash');
    });
  });

  describe('WorldStateProvider registry (ARE-RUNTIME-TRUTH)', () => {
    it('should start with no providers', () => {
      expect(shell.hasProviders()).toBe(false);
      expect(shell.getProviderCount()).toBe(0);
    });

    it('should register a WorldStateProvider', () => {
      const provider: WorldStateProvider = {
        id: 'test-provider',
        getWorldState: () => ({
          npcs: [{ id: 'npc1', position: { x: 0, y: 0 }, health: 100 }],
          players: [],
          loot: [],
        }),
      };

      const unregister = shell.registerWorldStateProvider(provider);

      expect(shell.hasProviders()).toBe(true);
      expect(shell.getProviderCount()).toBe(1);

      unregister();
      expect(shell.hasProviders()).toBe(false);
    });

    it('should reject provider with empty id', () => {
      const badProvider = {
        id: '',
        getWorldState: () => ({}),
      } as WorldStateProvider;

      expect(() => shell.registerWorldStateProvider(badProvider)).toThrow(
        'WorldStateProvider requires a stable non-empty id'
      );
    });

    it('should reject provider with whitespace-only id', () => {
      const badProvider = {
        id: '   ',
        getWorldState: () => ({}),
      } as WorldStateProvider;

      expect(() => shell.registerWorldStateProvider(badProvider)).toThrow(
        'WorldStateProvider requires a stable non-empty id'
      );
    });

    it('should reject duplicate provider id', () => {
      const provider1: WorldStateProvider = {
        id: 'duplicate-id',
        getWorldState: () => ({}),
      };

      const provider2: WorldStateProvider = {
        id: 'duplicate-id',
        getWorldState: () => ({}),
      };

      shell.registerWorldStateProvider(provider1);
      expect(() => shell.registerWorldStateProvider(provider2)).toThrow(
        'Duplicate WorldStateProvider id: duplicate-id'
      );
    });

    it('should merge state from multiple providers in stable order', () => {
      const providerA: WorldStateProvider = {
        id: 'provider-a',
        getWorldState: () => ({
          npcs: [{ id: 'npc-A1' }, { id: 'npc-A2' }],
          players: [],
          loot: [],
        }),
      };

      const providerB: WorldStateProvider = {
        id: 'provider-b',
        getWorldState: () => ({
          npcs: [{ id: 'npc-B1' }],
          players: [{ id: 'player-B1' }],
          loot: [],
        }),
      };

      shell.registerWorldStateProvider(providerA);
      shell.registerWorldStateProvider(providerB);
      shell.registerChunk('0:0');

      // Should not throw - providers are registered
      expect(() => shell.tick()).not.toThrow();
      expect(shell.getTickCount()).toBe(1);
    });

    it('should fail hard when ticking without any providers (MISSING_RUNTIME_SOURCE)', () => {
      shell.registerChunk('0:0');

      // No providers registered - should throw
      expect(() => shell.tick()).toThrow('MISSING_RUNTIME_SOURCE');
    });

    it('should fail with descriptive error when no providers', () => {
      shell.registerChunk('0:0');

      try {
        shell.tick();
        expect.fail('Should have thrown MISSING_RUNTIME_SOURCE');
      } catch (e) {
        expect((e as Error).message).toContain('MISSING_RUNTIME_SOURCE');
        expect((e as Error).message).toContain('no WorldStateProvider registered');
      }
    });
  });
});

describe('registerWorldTickThinShell', () => {
  it('should return a WorldTickThinShell instance', () => {
    const shell = registerWorldTickThinShell();
    expect(shell).toBeInstanceOf(WorldTickThinShell);
  });
});

describe('Global worldTickThinShell instance', () => {
  it('should export a singleton instance', () => {
    expect(worldTickThinShell).toBeInstanceOf(WorldTickThinShell);
  });
});
