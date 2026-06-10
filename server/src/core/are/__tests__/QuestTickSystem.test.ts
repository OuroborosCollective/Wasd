import { describe, it, expect } from 'vitest';
import { TickSystemPriority } from '../TickSystem.js';
import { QuestTickSystem } from '../QuestTickSystem.js';

describe('QuestTickSystem', () => {
  const createMockQuestEngine = () => ({
    acceptQuest: () => {},
    completeQuest: () => {},
    getQuestStatus: () => 'active',
  });

  describe('TickSystem interface compliance', () => {
    it('should have correct name', () => {
      const mock = createMockQuestEngine();
      const system = new QuestTickSystem(mock as any);
      
      expect(system.name).toBe('quest');
    });

    it('should have GAMEPLAY priority', () => {
      const mock = createMockQuestEngine();
      const system = new QuestTickSystem(mock as any);
      
      expect(system.priority).toBe(TickSystemPriority.GAMEPLAY);
    });

    it('should be enabled by default', () => {
      const mock = createMockQuestEngine();
      const system = new QuestTickSystem(mock as any);
      
      expect(system.enabled).toBe(true);
    });
  });

  describe('tick', () => {
    it('should execute without error', () => {
      const mock = createMockQuestEngine();
      const system = new QuestTickSystem(mock as any);
      
      expect(() => system.tick({ tickCount: 1 as any, isHighFrequencyTick: true })).not.toThrow();
    });
  });

  describe('getQuestEngine', () => {
    it('should expose the underlying QuestEngine', () => {
      const mock = createMockQuestEngine();
      const system = new QuestTickSystem(mock as any);
      
      expect(system.getQuestEngine()).toBe(mock);
    });
  });
});