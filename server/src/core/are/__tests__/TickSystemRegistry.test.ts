import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  TickSystemRegistry, 
  tickSystemRegistry,
  type TickSystemRegistryEvent 
} from '../TickSystemRegistry.js';
import { 
  TickSystem, 
  TickSystemPriority, 
  type TickSystemContext 
} from '../TickSystem.js';

/**
 * MockTickSystem creates a test tick system with configurable behavior.
 */
function createMockSystem(name: string, priority: TickSystemPriority, enabled = true): TickSystem {
  return {
    name,
    priority,
    enabled,
    tick: vi.fn(),
    onStart: vi.fn(),
    onEnd: vi.fn(),
    onShutdown: vi.fn(),
  };
}

describe('TickSystemRegistry', () => {
  let registry: TickSystemRegistry;

  beforeEach(() => {
    registry = new TickSystemRegistry();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a tick system', () => {
      const system = createMockSystem('test-system', TickSystemPriority.GAMEPLAY);
      
      registry.register({ system, dependencies: [], tags: ['test'] });
      
      expect(registry.get('test-system')).toBe(system);
    });

    it('should emit registered event', () => {
      const system = createMockSystem('test-system', TickSystemPriority.GAMEPLAY);
      const events: TickSystemRegistryEvent[] = [];
      registry.subscribe(e => events.push(e));
      
      registry.register({ system, dependencies: [], tags: ['test'] });
      
      expect(events).toContainEqual({
        type: 'registered',
        system: 'test-system',
        priority: TickSystemPriority.GAMEPLAY,
      });
    });

    it('should replace existing system with same name', () => {
      const system1 = createMockSystem('test-system', TickSystemPriority.GAMEPLAY);
      const system2 = createMockSystem('test-system', TickSystemPriority.FOUNDATION);
      
      registry.register({ system: system1, dependencies: [], tags: [] });
      registry.register({ system: system2, dependencies: [], tags: [] });
      
      expect(registry.get('test-system')).toBe(system2);
    });
  });

  describe('unregister', () => {
    it('should unregister a system', () => {
      const system = createMockSystem('test-system', TickSystemPriority.GAMEPLAY);
      registry.register({ system, dependencies: [], tags: [] });
      
      const result = registry.unregister('test-system');
      
      expect(result).toBe(true);
      expect(registry.get('test-system')).toBeUndefined();
    });

    it('should return false for non-existent system', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('enable/disable', () => {
    it('should enable a system', () => {
      const system = createMockSystem('test-system', TickSystemPriority.GAMEPLAY, false);
      registry.register({ system, dependencies: [], tags: [] });
      
      const result = registry.enable('test-system');
      
      expect(result).toBe(true);
      expect(registry.isEnabled('test-system')).toBe(true);
    });

    it('should disable a system', () => {
      const system = createMockSystem('test-system', TickSystemPriority.GAMEPLAY, true);
      registry.register({ system, dependencies: [], tags: [] });
      
      const result = registry.disable('test-system');
      
      expect(result).toBe(true);
      expect(registry.isEnabled('test-system')).toBe(false);
    });

    it('should return false for non-existent system', () => {
      expect(registry.enable('non-existent')).toBe(false);
      expect(registry.disable('non-existent')).toBe(false);
    });
  });

  describe('executeAll', () => {
    it('should execute systems in priority order', () => {
      const executionOrder: string[] = [];
      
      const system1: TickSystem = {
        name: 'low-priority',
        priority: TickSystemPriority.PERSISTENCE,
        enabled: true,
        tick: () => executionOrder.push('low-priority'),
      };
      
      const system2: TickSystem = {
        name: 'high-priority',
        priority: TickSystemPriority.INFRASTRUCTURE,
        enabled: true,
        tick: () => executionOrder.push('high-priority'),
      };
      
      const system3: TickSystem = {
        name: 'medium-priority',
        priority: TickSystemPriority.GAMEPLAY,
        enabled: true,
        tick: () => executionOrder.push('medium-priority'),
      };
      
      // Register in random order
      registry.register({ system: system1, dependencies: [], tags: [] });
      registry.register({ system: system2, dependencies: [], tags: [] });
      registry.register({ system: system3, dependencies: [], tags: [] });
      
      registry.executeAll({ tickCount: 1 as any, isHighFrequencyTick: true });
      
      expect(executionOrder).toEqual(['high-priority', 'medium-priority', 'low-priority']);
    });

    it('should skip disabled systems', () => {
      const executed: string[] = [];
      
      const system1: TickSystem = {
        name: 'enabled-system',
        priority: TickSystemPriority.GAMEPLAY,
        enabled: true,
        tick: () => executed.push('enabled'),
      };
      
      const system2: TickSystem = {
        name: 'disabled-system',
        priority: TickSystemPriority.FOUNDATION,
        enabled: false,
        tick: () => executed.push('disabled'),
      };
      
      registry.register({ system: system1, dependencies: [], tags: [] });
      registry.register({ system: system2, dependencies: [], tags: [] });
      
      registry.executeAll({ tickCount: 1 as any, isHighFrequencyTick: true });
      
      expect(executed).toEqual(['enabled']);
    });

    it('should continue executing even if one system throws', () => {
      const executed: string[] = [];
      
      const system1: TickSystem = {
        name: 'failing-system',
        priority: TickSystemPriority.GAMEPLAY,
        enabled: true,
        tick: () => { throw new Error('Test error'); },
      };
      
      const system2: TickSystem = {
        name: 'good-system',
        priority: TickSystemPriority.FOUNDATION,
        enabled: true,
        tick: () => executed.push('good'),
      };
      
      registry.register({ system: system1, dependencies: [], tags: [] });
      registry.register({ system: system2, dependencies: [], tags: [] });
      
      // Should not throw
      registry.executeAll({ tickCount: 1 as any, isHighFrequencyTick: true });
      
      expect(executed).toEqual(['good']);
    });
  });

  describe('notify hooks', () => {
    it('should call onStart for all systems', () => {
      const system = createMockSystem('test-system', TickSystemPriority.GAMEPLAY);
      registry.register({ system, dependencies: [], tags: [] });
      
      registry.notifyStart();
      
      expect(system.onStart).toHaveBeenCalled();
    });

    it('should call onEnd for all systems', () => {
      const system = createMockSystem('test-system', TickSystemPriority.GAMEPLAY);
      registry.register({ system, dependencies: [], tags: [] });
      
      registry.notifyEnd();
      
      expect(system.onEnd).toHaveBeenCalled();
    });

    it('should call onShutdown for all systems', () => {
      const system = createMockSystem('test-system', TickSystemPriority.GAMEPLAY);
      registry.register({ system, dependencies: [], tags: [] });
      
      registry.notifyShutdown();
      
      expect(system.onShutdown).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const system1 = createMockSystem('system-1', TickSystemPriority.INFRASTRUCTURE, true);
      const system2 = createMockSystem('system-2', TickSystemPriority.GAMEPLAY, false);
      const system3 = createMockSystem('system-3', TickSystemPriority.GAMEPLAY, true);
      
      registry.register({ system: system1, dependencies: [], tags: [] });
      registry.register({ system: system2, dependencies: [], tags: [] });
      registry.register({ system: system3, dependencies: [], tags: [] });
      
      const stats = registry.getStats();
      
      expect(stats.totalSystems).toBe(3);
      expect(stats.enabledSystems).toBe(2);
      expect(stats.disabledSystems).toBe(1);
    });
  });

  describe('getByTag', () => {
    it('should return systems with matching tag', () => {
      const combatSystem = createMockSystem('combat', TickSystemPriority.GAMEPLAY);
      const movementSystem = createMockSystem('movement', TickSystemPriority.GAMEPLAY);
      
      registry.register({ system: combatSystem, dependencies: [], tags: ['combat', 'damage'] });
      registry.register({ system: movementSystem, dependencies: [], tags: ['movement', 'spatial'] });
      
      const combatSystems = registry.getByTag('combat');
      
      expect(combatSystems).toContain(combatSystem);
      expect(combatSystems).not.toContain(movementSystem);
    });
  });
});

describe('Global registry instance', () => {
  it('should export a singleton instance', () => {
    expect(tickSystemRegistry).toBeInstanceOf(TickSystemRegistry);
  });
});