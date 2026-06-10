import { describe, it, expect } from 'vitest';
import { TickSystemPriority } from '../TickSystem.js';
import { GuildTickSystem } from '../GuildTickSystem.js';

describe('GuildTickSystem', () => {
  const createMockGuildSystem = () => ({
    addMember: () => {},
    removeMember: () => {},
    getMemberCount: () => 10,
  });

  describe('TickSystem interface compliance', () => {
    it('should have correct name', () => {
      const mock = createMockGuildSystem();
      const system = new GuildTickSystem(mock as any);
      
      expect(system.name).toBe('guild');
    });

    it('should have GAMEPLAY priority', () => {
      const mock = createMockGuildSystem();
      const system = new GuildTickSystem(mock as any);
      
      expect(system.priority).toBe(TickSystemPriority.GAMEPLAY);
    });

    it('should be enabled by default', () => {
      const mock = createMockGuildSystem();
      const system = new GuildTickSystem(mock as any);
      
      expect(system.enabled).toBe(true);
    });
  });

  describe('tick', () => {
    it('should execute without error', () => {
      const mock = createMockGuildSystem();
      const system = new GuildTickSystem(mock as any);
      
      expect(() => system.tick({ tickCount: 1 as any, isHighFrequencyTick: true })).not.toThrow();
    });
  });

  describe('getGuildSystem', () => {
    it('should expose the underlying GuildSystem', () => {
      const mock = createMockGuildSystem();
      const system = new GuildTickSystem(mock as any);
      
      expect(system.getGuildSystem()).toBe(mock);
    });
  });
});