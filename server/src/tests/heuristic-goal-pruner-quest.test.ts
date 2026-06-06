import { describe, expect, it } from 'vitest';
import {
  HeuristicGoalPruner,
  EchoZoneType,
  isInEchoZone,
  isHighIntensityZone,
  determineStateTransition,
  NPCState,
} from '../modules/quest/HeuristicGoalPruner';
import type { EchoZone, NPCLongTermGoal, NPCGoalType } from '../types/npc.types';

describe('HeuristicGoalPruner (Quest Module)', () => {
  describe('isInEchoZone', () => {
    it('returns true when NPC is inside zone radius', () => {
      const zone: EchoZone = { x: 100, y: 100, radius: 50, intensity: 0.8, type: EchoZoneType.COMBAT };
      expect(isInEchoZone(120, 100, zone)).toBe(true);
    });

    it('returns false when NPC is outside zone radius', () => {
      const zone: EchoZone = { x: 100, y: 100, radius: 50, intensity: 0.8, type: EchoZoneType.COMBAT };
      expect(isInEchoZone(200, 200, zone)).toBe(false);
    });

    it('uses squared distance for efficiency (no sqrt)', () => {
      const zone: EchoZone = { x: 0, y: 0, radius: 10, intensity: 0.8, type: EchoZoneType.COMBAT };
      // Point exactly at radius boundary
      expect(isInEchoZone(10, 0, zone)).toBe(false);
      expect(isInEchoZone(9.9, 0, zone)).toBe(true);
    });
  });

  describe('isHighIntensityZone', () => {
    it('returns true for combat zones above 0.95 intensity', () => {
      const zone: EchoZone = { x: 0, y: 0, radius: 50, intensity: 0.96, type: EchoZoneType.COMBAT };
      expect(isHighIntensityZone(zone)).toBe(true);
    });

    it('returns false for combat zones at or below 0.95 intensity', () => {
      const zone: EchoZone = { x: 0, y: 0, radius: 50, intensity: 0.95, type: EchoZoneType.COMBAT };
      expect(isHighIntensityZone(zone)).toBe(false);
    });

    it('returns true for collect zones above 0.80 intensity', () => {
      const zone: EchoZone = { x: 0, y: 0, radius: 50, intensity: 0.85, type: EchoZoneType.COLLECT };
      expect(isHighIntensityZone(zone)).toBe(true);
    });

    it('uses 0.70 threshold for other zone types', () => {
      const questZone: EchoZone = { x: 0, y: 0, radius: 50, intensity: 0.71, type: EchoZoneType.QUEST };
      const tradeZone: EchoZone = { x: 0, y: 0, radius: 50, intensity: 0.70, type: EchoZoneType.TRADE };
      expect(isHighIntensityZone(questZone)).toBe(true);
      expect(isHighIntensityZone(tradeZone)).toBe(false);
    });
  });

  describe('determineStateTransition', () => {
    it('maps COMBAT zone to combat state', () => {
      const zone: EchoZone = { x: 0, y: 0, radius: 50, intensity: 0.8, type: EchoZoneType.COMBAT };
      expect(determineStateTransition(zone)).toBe('combat');
    });

    it('maps COLLECT zone to collecting state', () => {
      const zone: EchoZone = { x: 0, y: 0, radius: 50, intensity: 0.8, type: EchoZoneType.COLLECT };
      expect(determineStateTransition(zone)).toBe('collecting');
    });

    it('maps QUEST zone to questing state', () => {
      const zone: EchoZone = { x: 0, y: 0, radius: 50, intensity: 0.8, type: EchoZoneType.QUEST };
      expect(determineStateTransition(zone)).toBe('questing');
    });

    it('maps TRADE zone to trading state', () => {
      const zone: EchoZone = { x: 0, y: 0, radius: 50, intensity: 0.8, type: EchoZoneType.TRADE };
      expect(determineStateTransition(zone)).toBe('trading');
    });

    it('maps SOCIAL zone to social state', () => {
      const zone: EchoZone = { x: 0, y: 0, radius: 50, intensity: 0.8, type: EchoZoneType.SOCIAL };
      expect(determineStateTransition(zone)).toBe('social');
    });

    it('defaults to wandering for unknown zone types', () => {
      const unknownZone = { x: 0, y: 0, radius: 50, intensity: 0.8, type: 'UNKNOWN' as EchoZoneType };
      expect(determineStateTransition(unknownZone)).toBe('wandering');
    });
  });

  describe('HeuristicGoalPruner.pruneByEchoIntensity', () => {
    it('returns no pruning when no high intensity zones exist', () => {
      const npc = {
        x: 100,
        y: 100,
        state: 'idle' as NPCState,
        memory: {
          longTermGoals: [
            { id: 'g1', type: 'idle', priority: 50 },
          ] as NPCLongTermGoal[],
          shortTermGoals: [],
          lastPruneTime: 0,
        },
      };

      const result = HeuristicGoalPruner.pruneByEchoIntensity(npc, []);

      expect(result.pruned).toBe(false);
      expect(result.goalsRemoved).toBe(0);
      expect(result.newState).toBe('idle');
    });

    it('filters goals when entering high intensity combat zone', () => {
      const npc = {
        x: 100,
        y: 100,
        state: 'idle' as NPCState,
        memory: {
          longTermGoals: [
            { id: 'g1', type: 'idle', priority: 30 },
            { id: 'g2', type: 'combat', priority: 90 },
            { id: 'g3', type: 'collect', priority: 70 },
          ] as NPCLongTermGoal[],
          shortTermGoals: [],
          lastPruneTime: 0,
        },
      };

      const zones: EchoZone[] = [
        { x: 100, y: 100, radius: 50, intensity: 0.96, type: EchoZoneType.COMBAT },
      ];

      const result = HeuristicGoalPruner.pruneByEchoIntensity(npc, zones);

      expect(result.pruned).toBe(true);
      expect(result.goalsRemoved).toBe(2);
      expect(result.newState).toBe('combat');
      expect(npc.memory.longTermGoals).toHaveLength(1);
    });

    it('filters goals when entering high intensity collect zone', () => {
      const npc = {
        x: 100,
        y: 100,
        state: 'idle' as NPCState,
        memory: {
          longTermGoals: [
            { id: 'g1', type: 'idle', priority: 30 },
            { id: 'g2', type: 'collect', priority: 70 },
            { id: 'g3', type: 'combat', priority: 90 },
          ] as NPCLongTermGoal[],
          shortTermGoals: [],
          lastPruneTime: 0,
        },
      };

      const zones: EchoZone[] = [
        { x: 100, y: 100, radius: 50, intensity: 0.85, type: EchoZoneType.COLLECT },
      ];

      const result = HeuristicGoalPruner.pruneByEchoIntensity(npc, zones);

      expect(result.pruned).toBe(true);
      expect(result.goalsRemoved).toBe(2);
      expect(result.newState).toBe('collecting');
    });

    it('ignores zones below high intensity threshold', () => {
      const npc = {
        x: 100,
        y: 100,
        state: 'idle' as NPCState,
        memory: {
          longTermGoals: [
            { id: 'g1', type: 'idle', priority: 30 },
            { id: 'g2', type: 'combat', priority: 90 },
          ] as NPCLongTermGoal[],
          shortTermGoals: [],
          lastPruneTime: 0,
        },
      };

      const zones: EchoZone[] = [
        { x: 100, y: 100, radius: 50, intensity: 0.90, type: EchoZoneType.COMBAT }, // Below 0.95
      ];

      const result = HeuristicGoalPruner.pruneByEchoIntensity(npc, zones);

      expect(result.pruned).toBe(false);
    });

    it('uses closest zone when multiple high intensity zones exist', () => {
      const npc = {
        x: 100,
        y: 100,
        state: 'idle' as NPCState,
        memory: {
          longTermGoals: [] as NPCLongTermGoal[],
          shortTermGoals: [],
          lastPruneTime: 0,
        },
      };

      const zones: EchoZone[] = [
        { x: 200, y: 200, radius: 50, intensity: 0.98, type: EchoZoneType.COMBAT }, // Far
        { x: 105, y: 105, radius: 50, intensity: 0.96, type: EchoZoneType.COLLECT }, // Close
      ];

      const result = HeuristicGoalPruner.pruneByEchoIntensity(npc, zones);

      expect(result.newState).toBe('collecting'); // Closest zone wins
    });
  });

  describe('Legacy Compatibility', () => {
    it('handles string goals via normalizeNPCGoal internally', () => {
      const npc = {
        x: 100,
        y: 100,
        state: 'idle' as NPCState,
        memory: {
          longTermGoals: ['guard_village', 'collect_wood'] as unknown as NPCLongTermGoal[],
          shortTermGoals: [],
          lastPruneTime: 0,
        },
      };

      const zones: EchoZone[] = [
        { x: 100, y: 100, radius: 50, intensity: 0.96, type: EchoZoneType.COMBAT },
      ];

      // Should not throw, even with string goals
      const result = HeuristicGoalPruner.pruneByEchoIntensity(npc, zones);
      
      // String goals should be filtered according to zone type
      expect(result.pruned).toBe(true);
      expect(result.goalsRemoved).toBe(1); // guard_village normalized to defend
      expect(npc.memory.longTermGoals).toHaveLength(1);
    });

    it('has consistent NPCState types available', () => {
      // NPCState is exported and can be used as a type
      const state: NPCState = 'combat';
      expect(state).toBe('combat');
      
      // NPCGoalType is available via import
      const goalType: NPCGoalType = 'combat';
      expect(goalType).toBe('combat');
    });
  });

  describe('HeuristicGoalPruner.isWithinRadius', () => {
    it('returns true for points within radius', () => {
      expect(HeuristicGoalPruner.isWithinRadius(0, 0, 3, 4, 5)).toBe(true);
    });

    it('returns false for points outside radius', () => {
      expect(HeuristicGoalPruner.isWithinRadius(0, 0, 6, 8, 5)).toBe(false);
    });

    it('uses squared distance calculation', () => {
      // 5^2 = 25, 6^2 = 36
      expect(HeuristicGoalPruner.isWithinRadius(0, 0, 5, 0, 5)).toBe(false); // Exactly at boundary
      expect(HeuristicGoalPruner.isWithinRadius(0, 0, 4.9, 0, 5)).toBe(true);
    });
  });

  describe('HeuristicGoalPruner.resetToWandering', () => {
    it('resets NPC to wandering state', () => {
      const npc = {
        state: 'combat' as NPCState,
        stateTimer: 1000,
        memory: {
          longTermGoals: [],
          shortTermGoals: [{ id: 'temp', type: 'idle', priority: 50 }] as NPCLongTermGoal[],
          lastPruneTime: 500,
        },
      };

      HeuristicGoalPruner.resetToWandering(npc);

      expect(npc.state).toBe('wandering');
      expect(npc.stateTimer).toBe(0);
      expect(npc.memory.shortTermGoals).toHaveLength(0);
    });
  });

  describe('HeuristicGoalPruner.getTopGoal', () => {
    it('returns highest priority goal', () => {
      const npc = {
        memory: {
          longTermGoals: [
            { id: 'g1', type: 'idle', priority: 30 },
            { id: 'g2', type: 'combat', priority: 90 },
            { id: 'g3', type: 'collect', priority: 60 },
          ] as NPCLongTermGoal[],
        },
      };

      const topGoal = HeuristicGoalPruner.getTopGoal(npc);

      expect(topGoal).toEqual({ id: 'g2', type: 'combat', priority: 90 });
    });

    it('returns undefined for empty goals', () => {
      const npc = {
        memory: {
          longTermGoals: [] as NPCLongTermGoal[],
        },
      };

      expect(HeuristicGoalPruner.getTopGoal(npc)).toBeUndefined();
    });
  });
});