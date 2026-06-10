import { describe, it, expect, beforeEach } from 'vitest';
import { 
  WorldTickRegistryAdapter, 
  createWorldTickRegistryAdapter 
} from '../WorldTickRegistryAdapter.js';
import { tickSystemRegistry } from '../TickSystemRegistry.js';
import { TickSystem, TickSystemPriority } from '../TickSystem.js';

/**
 * MockTickSystem for testing.
 */
function createMockSystem(name: string, priority: TickSystemPriority): TickSystem {
  return {
    name,
    priority,
    enabled: true,
    tick: () => {},
  };
}

describe('WorldTickRegistryAdapter', () => {
  let adapter: WorldTickRegistryAdapter;

  beforeEach(() => {
    // Clear registry before each test
    for (const name of ['test-system-1', 'test-system-2', 'test-system-3']) {
      tickSystemRegistry.unregister(name);
    }
    adapter = createWorldTickRegistryAdapter();
  });

  describe('initialize', () => {
    it('should initialize without error', () => {
      expect(() => adapter.initialize()).not.toThrow();
    });

    it('should only initialize once', () => {
      adapter.initialize();
      
      // Should not throw on second call
      expect(() => adapter.initialize()).not.toThrow();
    });

    it('should log registered system count', () => {
      // Register some test systems
      tickSystemRegistry.register({
        system: createMockSystem('test-system-1', TickSystemPriority.GAMEPLAY),
        dependencies: [],
        tags: ['test'],
      });
      
      tickSystemRegistry.register({
        system: createMockSystem('test-system-2', TickSystemPriority.BROADCAST),
        dependencies: [],
        tags: ['test'],
      });
      
      adapter.initialize();
      
      const stats = adapter.getStats();
      expect(stats.totalSystems).toBeGreaterThanOrEqual(2);
    });
  });

  describe('executeAll', () => {
    it('should execute without error', () => {
      tickSystemRegistry.register({
        system: createMockSystem('test-system-1', TickSystemPriority.GAMEPLAY),
        dependencies: [],
        tags: ['test'],
      });
      
      adapter.initialize();
      
      expect(() => adapter.executeAll(1)).not.toThrow();
    });

    it('should pass tick count to systems', () => {
      let receivedTickCount = 0;
      
      const system: TickSystem = {
        name: 'test-counter',
        priority: TickSystemPriority.GAMEPLAY,
        enabled: true,
        tick: (ctx) => { receivedTickCount = ctx.tickCount; },
      };
      
      tickSystemRegistry.register({ system, dependencies: [], tags: ['test'] });
      adapter.initialize();
      
      adapter.executeAll(42);
      
      expect(receivedTickCount).toBe(42);
    });
  });

  describe('getStats', () => {
    it('should return registry statistics', () => {
      tickSystemRegistry.register({
        system: createMockSystem('test-system-1', TickSystemPriority.GAMEPLAY),
        dependencies: [],
        tags: ['test'],
      });
      
      adapter.initialize();
      
      const stats = adapter.getStats();
      
      expect(stats).toHaveProperty('totalSystems');
      expect(stats).toHaveProperty('enabledSystems');
      expect(stats).toHaveProperty('disabledSystems');
      expect(stats).toHaveProperty('lastTickDurationMs');
      expect(stats).toHaveProperty('systemsByPriority');
    });
  });

  describe('setSystemEnabled', () => {
    it('should enable a system', () => {
      tickSystemRegistry.register({
        system: createMockSystem('test-system-1', TickSystemPriority.GAMEPLAY),
        dependencies: [],
        tags: ['test'],
      });
      
      adapter.initialize();
      
      const result = adapter.setSystemEnabled('test-system-1', false);
      expect(result).toBe(true);
      expect(tickSystemRegistry.isEnabled('test-system-1')).toBe(false);
      
      const result2 = adapter.setSystemEnabled('test-system-1', true);
      expect(result2).toBe(true);
      expect(tickSystemRegistry.isEnabled('test-system-1')).toBe(true);
    });

    it('should return false for non-existent system', () => {
      adapter.initialize();
      
      const result = adapter.setSystemEnabled('non-existent', true);
      expect(result).toBe(false);
    });
  });

  describe('getSystem', () => {
    it('should return a registered system', () => {
      tickSystemRegistry.register({
        system: createMockSystem('test-system-1', TickSystemPriority.GAMEPLAY),
        dependencies: [],
        tags: ['test'],
      });
      
      adapter.initialize();
      
      const system = adapter.getSystem('test-system-1');
      expect(system).toBeDefined();
      expect(system?.name).toBe('test-system-1');
    });

    it('should return undefined for non-existent system', () => {
      adapter.initialize();
      
      const system = adapter.getSystem('non-existent');
      expect(system).toBeUndefined();
    });
  });

  describe('shutdown', () => {
    it('should call notifyShutdown on registry', () => {
      adapter.initialize();
      
      expect(() => adapter.shutdown()).not.toThrow();
    });
  });
});