import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TickSystemPriority } from '../TickSystem.js';
import { NPCTickSystem } from '../NPCTickSystem.js';

describe('NPCTickSystem', () => {
  const createMockNPCSystem = () => ({
    tick: vi.fn(),
    getAllNPCs: vi.fn().mockReturnValue([]),
    drainWorldChatEvents: vi.fn().mockReturnValue([]),
  });

  describe('TickSystem interface compliance', () => {
    it('should have correct name', () => {
      const mockSystem = createMockNPCSystem();
      const system = new NPCTickSystem(mockSystem as any);
      
      expect(system.name).toBe('npc');
    });

    it('should have FOUNDATION priority', () => {
      const mockSystem = createMockNPCSystem();
      const system = new NPCTickSystem(mockSystem as any);
      
      expect(system.priority).toBe(TickSystemPriority.FOUNDATION);
    });

    it('should be enabled by default', () => {
      const mockSystem = createMockNPCSystem();
      const system = new NPCTickSystem(mockSystem as any);
      
      expect(system.enabled).toBe(true);
    });
  });

  describe('tick', () => {
    it('should call npcSystem.tick with providers', () => {
      const mockSystem = createMockNPCSystem();
      const system = new NPCTickSystem(mockSystem as any);
      
      system.setPlayersProvider(() => [{ id: 'player1' }]);
      system.setWorldTimeProvider(() => 1000);
      
      system.tick({ tickCount: 10 as any, isHighFrequencyTick: true });
      
      expect(mockSystem.tick).toHaveBeenCalledWith(
        [{ id: 'player1' }],
        1000
      );
    });

    it('should handle missing providers', () => {
      const mockSystem = createMockNPCSystem();
      const system = new NPCTickSystem(mockSystem as any);
      
      // Should not throw
      system.tick({ tickCount: 10 as any, isHighFrequencyTick: true });
      
      expect(mockSystem.tick).toHaveBeenCalledWith([], 1000);
    });
  });

  describe('getAllNPCs', () => {
    it('should delegate to npcSystem.getAllNPCs', () => {
      const mockSystem = createMockNPCSystem();
      mockSystem.getAllNPCs.mockReturnValue([{ id: 'npc1' }, { id: 'npc2' }]);
      
      const system = new NPCTickSystem(mockSystem as any);
      const npcs = system.getAllNPCs();
      
      expect(npcs).toHaveLength(2);
      expect(npcs[0].id).toBe('npc1');
    });
  });

  describe('drainChatEvents', () => {
    it('should delegate to npcSystem.drainWorldChatEvents', () => {
      const mockSystem = createMockNPCSystem();
      const events = [{ senderId: 'npc1', text: 'Hello' }];
      mockSystem.drainWorldChatEvents.mockReturnValue(events);
      
      const system = new NPCTickSystem(mockSystem as any);
      const result = system.drainChatEvents();
      
      expect(result).toEqual(events);
    });
  });
});