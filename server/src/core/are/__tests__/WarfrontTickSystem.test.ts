import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TickSystemPriority } from '../TickSystem.js';
import { WarfrontTickSystem } from '../WarfrontTickSystem.js';

describe('WarfrontTickSystem', () => {
  // Mock WarfrontSystem
  const createMockWarfrontSystem = () => ({
    tick: vi.fn().mockReturnValue({ rotated: false }),
    getCycleSnapshot: vi.fn().mockReturnValue({ cycleId: 'test' }),
  });

  describe('TickSystem interface compliance', () => {
    it('should have correct name', () => {
      const mock = createMockWarfrontSystem();
      const system = new WarfrontTickSystem(mock as any);
      
      expect(system.name).toBe('warfront');
    });

    it('should have GAMEPLAY priority', () => {
      const mock = createMockWarfrontSystem();
      const system = new WarfrontTickSystem(mock as any);
      
      expect(system.priority).toBe(TickSystemPriority.GAMEPLAY);
    });

    it('should be enabled by default', () => {
      const mock = createMockWarfrontSystem();
      const system = new WarfrontTickSystem(mock as any);
      
      expect(system.enabled).toBe(true);
    });
  });

  describe('tick', () => {
    it('should call warfrontSystem.tick with scaled tick count', () => {
      const mock = createMockWarfrontSystem();
      const system = new WarfrontTickSystem(mock as any);
      
      system.tick({ tickCount: 100 as any, isHighFrequencyTick: true });
      
      expect(mock.tick).toHaveBeenCalledWith(10000); // 100 * 100
    });

    it('should pass through the return value', () => {
      const mock = createMockWarfrontSystem();
      mock.tick.mockReturnValue({ rotated: true, previousCycleId: 'old', nextCycleId: 'new' });
      
      const system = new WarfrontTickSystem(mock as any);
      const result = system.tick({ tickCount: 50 as any, isHighFrequencyTick: true });
      
      expect(result).toEqual({ rotated: true, previousCycleId: 'old', nextCycleId: 'new' });
    });
  });

  describe('getWarfrontSystem', () => {
    it('should expose the underlying WarfrontSystem', () => {
      const mock = createMockWarfrontSystem();
      const system = new WarfrontTickSystem(mock as any);
      
      expect(system.getWarfrontSystem()).toBe(mock);
    });
  });
});