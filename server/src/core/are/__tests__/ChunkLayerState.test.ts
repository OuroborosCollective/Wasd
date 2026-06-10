import { describe, it, expect } from 'vitest';
import {
  ChunkLayerIndex,
  LAYER_NAMES,
  createEmptyLayerState,
  LAYER_THRESHOLDS,
  ATTRACTOR_TYPES
} from '../ChunkLayerState.js';
import { createKappa } from '../types.js';

describe('ChunkLayerState', () => {
  describe('ChunkLayerIndex', () => {
    it('should have 13 layers defined', () => {
      expect(Object.keys(ChunkLayerIndex).length / 2).toBe(13); // /2 because enum generates both key and value
    });

    it('should have correct layer ordering', () => {
      expect(ChunkLayerIndex.ECOLOGY).toBe(1);
      expect(ChunkLayerIndex.ECONOMY).toBe(2);
      expect(ChunkLayerIndex.NPC_VITALITY).toBe(3);
      expect(ChunkLayerIndex.TRADE).toBe(4);
      expect(ChunkLayerIndex.SOCIAL_MEMORY).toBe(5);
      expect(ChunkLayerIndex.POLITICS).toBe(6);
      expect(ChunkLayerIndex.AGGRESSION).toBe(7);
      expect(ChunkLayerIndex.CONJUNCTURE).toBe(8);
      expect(ChunkLayerIndex.KINGDOM).toBe(9);
      expect(ChunkLayerIndex.FAITH).toBe(10);
      expect(ChunkLayerIndex.DUNGEON).toBe(11);
      expect(ChunkLayerIndex.FEAR).toBe(12);
      expect(ChunkLayerIndex.RESURRECTION).toBe(13);
    });
  });

  describe('LAYER_NAMES', () => {
    it('should have names for all 13 layers', () => {
      for (let i = 1; i <= 13; i++) {
        expect(LAYER_NAMES[i as ChunkLayerIndex]).toBeDefined();
      }
    });

    it('should have correct names', () => {
      expect(LAYER_NAMES[ChunkLayerIndex.ECOLOGY]).toBe('ecology');
      expect(LAYER_NAMES[ChunkLayerIndex.AGGRESSION]).toBe('aggression');
      expect(LAYER_NAMES[ChunkLayerIndex.DUNGEON]).toBe('dungeon');
    });
  });

  describe('createEmptyLayerState', () => {
    it('should create state with all zeros', () => {
      const state = createEmptyLayerState();
      
      expect(state.ecology).toBe(0);
      expect(state.economy).toBe(0);
      expect(state.npc_vitality).toBe(0);
      expect(state.trade).toBe(0);
      expect(state.social_memory).toBe(0);
      expect(state.politics).toBe(0);
      expect(state.aggression).toBe(0);
      expect(state.conjuncture).toBe(0);
      expect(state.kingdom).toBe(0);
      expect(state.faith).toBe(0);
      expect(state.dungeon).toBe(0);
      expect(state.fear).toBe(0);
      expect(state.resurrection).toBe(0);
    });

    it('should create independent copies', () => {
      const state1 = createEmptyLayerState();
      const state2 = createEmptyLayerState();
      
      // Modify state1
      state1.aggression = createKappa(500);
      
      // state2 should be unchanged
      expect(state2.aggression).toBe(0);
    });
  });

  describe('LAYER_THRESHOLDS', () => {
    it('should have aggression spike threshold', () => {
      expect(LAYER_THRESHOLDS.AGGRESSION_SPIKE).toBeDefined();
      expect(LAYER_THRESHOLDS.AGGRESSION_SPIKE).toBe(750);
    });

    it('should have trade city threshold', () => {
      expect(LAYER_THRESHOLDS.TRADE_CITY_THRESHOLD).toBeDefined();
      expect(LAYER_THRESHOLDS.TRADE_CITY_THRESHOLD).toBe(800);
    });

    it('should have dungeon spawn threshold', () => {
      expect(LAYER_THRESHOLDS.DUNGEON_SPAWN).toBeDefined();
      expect(LAYER_THRESHOLDS.DUNGEON_SPAWN).toBe(800);
    });

    it('should have faith cult threshold', () => {
      expect(LAYER_THRESHOLDS.FAITH_CULT_THRESHOLD).toBeDefined();
      expect(LAYER_THRESHOLDS.FAITH_CULT_THRESHOLD).toBe(700);
    });
  });

  describe('ATTRACTOR_TYPES', () => {
    it('should define village_to_city attractor', () => {
      expect(ATTRACTOR_TYPES.VILLAGE_TO_CITY).toBe('village_to_city');
    });

    it('should define aggression_spike attractor', () => {
      expect(ATTRACTOR_TYPES.AGGRESSION_SPIKE).toBe('aggression_spike');
    });

    it('should define dungeon_emergence attractor', () => {
      expect(ATTRACTOR_TYPES.DUNGEON_EMERGENCE).toBe('dungeon_emergence');
    });

    it('should define stable attractor', () => {
      expect(ATTRACTOR_TYPES.STABLE).toBe('stable');
    });
  });
});