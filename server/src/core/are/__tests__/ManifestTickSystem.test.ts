import { describe, it, expect } from 'vitest';
import { TickSystemPriority } from '../TickSystem.js';
import { ManifestTickSystem } from '../ManifestTickSystem.js';

describe('ManifestTickSystem', () => {
  describe('TickSystem interface compliance', () => {
    it('should have correct name', () => {
      const system = new ManifestTickSystem();
      expect(system.name).toBe('manifest');
    });

    it('should have INFRASTRUCTURE priority', () => {
      const system = new ManifestTickSystem();
      expect(system.priority).toBe(TickSystemPriority.INFRASTRUCTURE);
    });

    it('should be enabled by default', () => {
      const system = new ManifestTickSystem();
      expect(system.enabled).toBe(true);
    });
  });

  describe('tick', () => {
    it('should handle missing manifest manager', () => {
      const system = new ManifestTickSystem();
      
      // Should not throw
      system.tick({ tickCount: 1 as any, isHighFrequencyTick: true });
      
      expect(system.isHealthy()).toBe(true);
    });

    it('should delegate to manifest manager when available', () => {
      const mockManager = {
        tick: vi.fn(),
        isHealthy: () => true,
      };
      
      const system = new ManifestTickSystem(mockManager as any);
      system.tick({ tickCount: 1 as any, isHighFrequencyTick: true });
      
      expect(mockManager.tick).toHaveBeenCalled();
    });
  });

  describe('lifecycle hooks', () => {
    it('should call onStart without error', () => {
      const system = new ManifestTickSystem();
      
      expect(() => system.onStart()).not.toThrow();
    });

    it('should call onShutdown without error', () => {
      const system = new ManifestTickSystem();
      system.onStart();
      
      expect(() => system.onShutdown()).not.toThrow();
      expect(system.isHealthy()).toBe(false);
    });
  });
});
