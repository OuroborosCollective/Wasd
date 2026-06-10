import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TickSystemPriority } from '../TickSystem.js';
import { CombatTickSystem } from '../CombatTickSystem.js';

describe('CombatTickSystem', () => {
  const createMockCombatSystem = () => ({
    attack: vi.fn().mockReturnValue({ success: true, hit: true, damage: 100 }),
    attackWithWeapon: vi.fn(),
    spellStrike: vi.fn(),
  });

  const createMockCombatService = () => ({
    handleSkillRequest: vi.fn(),
  });

  describe('TickSystem interface compliance', () => {
    it('should have correct name', () => {
      const mockSystem = createMockCombatSystem();
      const mockService = createMockCombatService();
      const system = new CombatTickSystem(mockSystem as any, mockService as any);
      
      expect(system.name).toBe('combat');
    });

    it('should have GAMEPLAY priority', () => {
      const mockSystem = createMockCombatSystem();
      const mockService = createMockCombatService();
      const system = new CombatTickSystem(mockSystem as any, mockService as any);
      
      expect(system.priority).toBe(TickSystemPriority.GAMEPLAY);
    });

    it('should be enabled by default', () => {
      const mockSystem = createMockCombatSystem();
      const mockService = createMockCombatService();
      const system = new CombatTickSystem(mockSystem as any, mockService as any);
      
      expect(system.enabled).toBe(true);
    });
  });

  describe('tick', () => {
    it('should execute without error', () => {
      const mockSystem = createMockCombatSystem();
      const mockService = createMockCombatService();
      const system = new CombatTickSystem(mockSystem as any, mockService as any);
      
      expect(() => system.tick({ tickCount: 1 as any, isHighFrequencyTick: true })).not.toThrow();
    });
  });

  describe('getCombatSystem', () => {
    it('should expose the underlying CombatSystem', () => {
      const mockSystem = createMockCombatSystem();
      const mockService = createMockCombatService();
      const system = new CombatTickSystem(mockSystem as any, mockService as any);
      
      expect(system.getCombatSystem()).toBe(mockSystem);
    });
  });

  describe('getCombatService', () => {
    it('should expose the underlying CombatService', () => {
      const mockSystem = createMockCombatSystem();
      const mockService = createMockCombatService();
      const system = new CombatTickSystem(mockSystem as any, mockService as any);
      
      expect(system.getCombatService()).toBe(mockService);
    });
  });
});