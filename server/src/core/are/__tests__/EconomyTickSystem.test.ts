import { describe, it, expect } from 'vitest';
import { TickSystemPriority } from '../TickSystem.js';
import { EconomyTickSystem } from '../EconomyTickSystem.js';

describe('EconomyTickSystem', () => {
  const createMockEconomySystem = () => ({
    addGold: () => {},
    removeGold: () => true,
    getPrice: () => 100,
    adjustPrice: () => {},
  });

  describe('TickSystem interface compliance', () => {
    it('should have correct name', () => {
      const mock = createMockEconomySystem();
      const system = new EconomyTickSystem(mock as any);
      
      expect(system.name).toBe('economy');
    });

    it('should have GAMEPLAY priority', () => {
      const mock = createMockEconomySystem();
      const system = new EconomyTickSystem(mock as any);
      
      expect(system.priority).toBe(TickSystemPriority.GAMEPLAY);
    });

    it('should be enabled by default', () => {
      const mock = createMockEconomySystem();
      const system = new EconomyTickSystem(mock as any);
      
      expect(system.enabled).toBe(true);
    });
  });

  describe('tick', () => {
    it('should execute without error', () => {
      const mock = createMockEconomySystem();
      const system = new EconomyTickSystem(mock as any);
      
      expect(() => system.tick({ tickCount: 1 as any, isHighFrequencyTick: true })).not.toThrow();
    });

    it('should handle price recalculation on interval', () => {
      const mock = createMockEconomySystem();
      const system = new EconomyTickSystem(mock as any);
      
      // Should not throw on any tick count
      system.tick({ tickCount: 100 as any, isHighFrequencyTick: true });
      system.tick({ tickCount: 200 as any, isHighFrequencyTick: true });
    });
  });

  describe('getEconomySystem', () => {
    it('should expose the underlying EconomySystem', () => {
      const mock = createMockEconomySystem();
      const system = new EconomyTickSystem(mock as any);
      
      expect(system.getEconomySystem()).toBe(mock);
    });
  });
});