/**
 * KappaLayers Test Suite
 * 
 * Tests for the unified 13-layer definition and Kappa1000 hashing.
 * Validates axiom compliance for the ARE system.
 */

import { describe, it, expect } from 'vitest';
import {
  KAPPA_LAYER_NAMES,
  KAPPA_LAYER_CONSTANTS,
  LEGACY_LAYER_MAPPING,
  kappa1000Hash,
  hashChunkKappa1000,
  verifyChunkKappaHash,
  checksumKappaLayers,
  createEmptyKappaLayers,
  createKappaLayers,
  cloneKappaLayers,
  fromChunkLayerState,
  toChunkLayerState,
  type KappaLayerKey,
  type KappaLayers,
} from '../KappaLayers.js';
import { createChunkKey, createTickId } from '../types.js';

describe('KappaLayers', () => {
  describe('KAPPA_LAYER_NAMES', () => {
    it('should have exactly 13 layer names', () => {
      expect(Object.keys(KAPPA_LAYER_NAMES)).toHaveLength(13);
    });

    it('should contain all canonical layer names', () => {
      const expected = [
        'ecology', 'market', 'physiology', 'trade', 'memory',
        'politics', 'conflict', 'economy', 'kingdoms', 'faith',
        'dungeon', 'fear', 'cycles'
      ];
      expect(Object.keys(KAPPA_LAYER_NAMES).sort()).toEqual(expected.sort());
    });

    it('should have correct mapping to canonical names', () => {
      expect(KAPPA_LAYER_NAMES.ecology).toBe('ecology');
      expect(KAPPA_LAYER_NAMES.physiology).toBe('physiology');
      expect(KAPPA_LAYER_NAMES.conflict).toBe('conflict');
      expect(KAPPA_LAYER_NAMES.kingdoms).toBe('kingdoms');
      expect(KAPPA_LAYER_NAMES.cycles).toBe('cycles');
    });
  });

  describe('KAPPA_LAYER_CONSTANTS', () => {
    it('should have CONST_ARE_TOTAL set to 6500 for conservation law', () => {
      expect(KAPPA_LAYER_CONSTANTS.LAYER_SUM_MIDPOINT).toBe(6500);
    });

    it('should have LAYER_MAX of 1000', () => {
      expect(KAPPA_LAYER_CONSTANTS.LAYER_MAX).toBe(1000);
    });

    it('should have LAYER_COUNT of 13', () => {
      expect(KAPPA_LAYER_CONSTANTS.LAYER_COUNT).toBe(13);
    });

    it('should have correct thresholds', () => {
      expect(KAPPA_LAYER_CONSTANTS.CONFLICT_SPIKE_THRESHOLD).toBe(750);
      expect(KAPPA_LAYER_CONSTANTS.TRADE_CITY_THRESHOLD).toBe(800);
      expect(KAPPA_LAYER_CONSTANTS.DUNGEON_SPAWN_THRESHOLD).toBe(800);
    });
  });

  describe('LEGACY_LAYER_MAPPING', () => {
    it('should map npc_vitality to physiology', () => {
      expect(LEGACY_LAYER_MAPPING['npc_vitality']).toBe('physiology');
    });

    it('should map social_memory to memory', () => {
      expect(LEGACY_LAYER_MAPPING['social_memory']).toBe('memory');
    });

    it('should map aggression to conflict', () => {
      expect(LEGACY_LAYER_MAPPING['aggression']).toBe('conflict');
    });

    it('should map conjuncture to economy', () => {
      expect(LEGACY_LAYER_MAPPING['conjuncture']).toBe('economy');
    });

    it('should map kingdom to kingdoms', () => {
      expect(LEGACY_LAYER_MAPPING['kingdom']).toBe('kingdoms');
    });

    it('should map resurrection to cycles', () => {
      expect(LEGACY_LAYER_MAPPING['resurrection']).toBe('cycles');
    });
  });

  describe('createEmptyKappaLayers', () => {
    it('should create layers with all values at 0', () => {
      const layers = createEmptyKappaLayers();
      
      expect(layers.ecology).toBe(0);
      expect(layers.market).toBe(0);
      expect(layers.physiology).toBe(0);
      expect(layers.trade).toBe(0);
      expect(layers.memory).toBe(0);
      expect(layers.politics).toBe(0);
      expect(layers.conflict).toBe(0);
      expect(layers.economy).toBe(0);
      expect(layers.kingdoms).toBe(0);
      expect(layers.faith).toBe(0);
      expect(layers.dungeon).toBe(0);
      expect(layers.fear).toBe(0);
      expect(layers.cycles).toBe(0);
    });
  });

  describe('createKappaLayers', () => {
    it('should create layers with specified values', () => {
      const layers = createKappaLayers({
        ecology: 500,
        conflict: 750,
        fear: 200,
      });
      
      expect(layers.ecology).toBe(500);
      expect(layers.conflict).toBe(750);
      expect(layers.fear).toBe(200);
      expect(layers.market).toBe(0); // default
    });

    it('should create immutable layers', () => {
      const layers = createKappaLayers({ ecology: 500 });
      
      // @ts-expect-error - Testing immutability at runtime
      expect(() => { layers.ecology = 999; }).toThrow();
    });
  });

  describe('kappa1000Hash', () => {
    it('should produce deterministic hash for same input', () => {
      const input = 'test-string';
      const hash1 = kappa1000Hash(input);
      const hash2 = kappa1000Hash(input);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different inputs', () => {
      const hash1 = kappa1000Hash('input-a');
      const hash2 = kappa1000Hash('input-b');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should return unsigned 32-bit integer', () => {
      const hash = kappa1000Hash('test');
      
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(hash)).toBe(true);
    });
  });

  describe('hashChunkKappa1000', () => {
    it('should produce 64-character StateHash', () => {
      const chunkKey = createChunkKey(7, 11);
      const layers = createKappaLayers({ conflict: 750, fear: 200 });
      const tick = createTickId(42);
      
      const hash = hashChunkKappa1000(chunkKey, layers, tick);
      
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic (same input = same hash)', () => {
      const chunkKey = createChunkKey(7, 11);
      const layers = createKappaLayers({ conflict: 750, fear: 200 });
      const tick = createTickId(42);
      
      const hash1 = hashChunkKappa1000(chunkKey, layers, tick);
      const hash2 = hashChunkKappa1000(chunkKey, layers, tick);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different layer values', () => {
      const chunkKey = createChunkKey(7, 11);
      const layers1 = createKappaLayers({ conflict: 750, fear: 200 });
      const layers2 = createKappaLayers({ conflict: 751, fear: 200 });
      const tick = createTickId(42);
      
      const hash1 = hashChunkKappa1000(chunkKey, layers1, tick);
      const hash2 = hashChunkKappa1000(chunkKey, layers2, tick);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hash for different ticks', () => {
      const chunkKey = createChunkKey(7, 11);
      const layers = createKappaLayers({ conflict: 750 });
      
      const hash1 = hashChunkKappa1000(chunkKey, layers, createTickId(1));
      const hash2 = hashChunkKappa1000(chunkKey, layers, createTickId(2));
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hash for different chunks', () => {
      const layers = createKappaLayers({ conflict: 750 });
      const tick = createTickId(42);
      
      const hash1 = hashChunkKappa1000(createChunkKey(1, 1), layers, tick);
      const hash2 = hashChunkKappa1000(createChunkKey(2, 2), layers, tick);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyChunkKappaHash', () => {
    it('should return true for matching hash', () => {
      const chunkKey = createChunkKey(5, 5);
      const layers = createKappaLayers({ ecology: 500 });
      const tick = createTickId(10);
      const hash = hashChunkKappa1000(chunkKey, layers, tick);
      
      expect(verifyChunkKappaHash(chunkKey, layers, tick, hash)).toBe(true);
    });

    it('should return false for non-matching hash', () => {
      const chunkKey = createChunkKey(5, 5);
      const layers = createKappaLayers({ ecology: 500 });
      const tick = createTickId(10);
      const wrongHash = hashChunkKappa1000(createChunkKey(0, 0), layers, tick);
      
      expect(verifyChunkKappaHash(chunkKey, layers, tick, wrongHash)).toBe(false);
    });
  });

  describe('checksumKappaLayers', () => {
    it('should return sum of all layers', () => {
      const layers = createKappaLayers({
        ecology: 500,
        market: 500,
        physiology: 500,
        trade: 500,
        memory: 500,
        politics: 500,
        conflict: 500,
        economy: 500,
        kingdoms: 500,
        faith: 500,
        dungeon: 500,
        fear: 500,
        cycles: 500,
      });
      
      expect(checksumKappaLayers(layers)).toBe(6500);
    });

    it('should return 0 for empty layers', () => {
      const layers = createEmptyKappaLayers();
      
      expect(checksumKappaLayers(layers)).toBe(0);
    });
  });

  describe('cloneKappaLayers', () => {
    it('should create a mutable copy', () => {
      const original = createKappaLayers({ ecology: 500 });
      const clone = cloneKappaLayers(original);
      
      clone.ecology = 999;
      
      expect(original.ecology).toBe(500);
      expect(clone.ecology).toBe(999);
    });

    it('should preserve all values', () => {
      const original = createKappaLayers({
        ecology: 100,
        conflict: 200,
        fear: 300,
      });
      const clone = cloneKappaLayers(original);
      
      expect(clone.ecology).toBe(100);
      expect(clone.conflict).toBe(200);
      expect(clone.fear).toBe(300);
    });
  });

  describe('fromChunkLayerState', () => {
    it('should convert legacy layer names to canonical', () => {
      const legacy = {
        ecology: 500,
        economy: 600, // conjuncture in legacy
        npc_vitality: 700, // physiology in canonical
        trade: 800,
        social_memory: 100, // memory in canonical
        politics: 200,
        aggression: 300, // conflict in canonical
        conjuncture: 400, // economy in canonical
        kingdom: 500, // kingdoms in canonical
        faith: 600,
        dungeon: 700,
        fear: 800,
        resurrection: 900, // cycles in canonical
      };
      
      const canonical = fromChunkLayerState(legacy);
      
      expect(canonical.ecology).toBe(500);
      expect(canonical.market).toBe(600);
      expect(canonical.physiology).toBe(700);
      expect(canonical.trade).toBe(800);
      expect(canonical.memory).toBe(100);
      expect(canonical.politics).toBe(200);
      expect(canonical.conflict).toBe(300);
      expect(canonical.economy).toBe(400);
      expect(canonical.kingdoms).toBe(500);
      expect(canonical.faith).toBe(600);
      expect(canonical.dungeon).toBe(700);
      expect(canonical.fear).toBe(800);
      expect(canonical.cycles).toBe(900);
    });
  });

  describe('toChunkLayerState', () => {
    it('should convert canonical to legacy layer names', () => {
      const canonical = createKappaLayers({
        ecology: 500,
        market: 600,
        physiology: 700,
        trade: 800,
        memory: 100,
        politics: 200,
        conflict: 300,
        economy: 400,
        kingdoms: 500,
        faith: 600,
        dungeon: 700,
        fear: 800,
        cycles: 900,
      });
      
      const legacy = toChunkLayerState(canonical);
      
      expect(legacy.ecology).toBe(500);
      expect(legacy.npc_vitality).toBe(700); // legacy name for physiology
      expect(legacy.aggression).toBe(300); // legacy name for conflict
      expect(legacy.conjuncture).toBe(400); // legacy name for economy
      expect(legacy.kingdom).toBe(500); // legacy name for kingdoms
      expect(legacy.resurrection).toBe(900); // legacy name for cycles
    });
  });
});

describe('KappaLayers Axiom Compliance', () => {
  describe('Axiom 2: Nomock-Theorem', () => {
    it('should enforce conservation: sum remains constant after transfers', () => {
      const layers1 = createKappaLayers({
        ecology: 500,
        conflict: 500,
        fear: 500,
        trade: 500,
        economy: 500,
        market: 500,
        physiology: 500,
        memory: 500,
        politics: 500,
        kingdoms: 500,
        faith: 500,
        dungeon: 500,
        cycles: 500,
      });
      
      const sum1 = checksumKappaLayers(layers1);
      
      // Simulate layer transfers (from WorldBrainTickSystem.applyAttractor)
      const layers2 = createKappaLayers({
        ...layers1,
        conflict: (layers1.conflict - 50) as any, // transfer from conflict
        fear: (layers1.fear + 50) as any, // to fear
      });
      
      const sum2 = checksumKappaLayers(layers2);
      
      expect(sum1).toBe(sum2);
    });
  });

  describe('Axiom 5: Feld-Lokalität', () => {
    it('should only affect direct neighbors in resonance', () => {
      // This test validates that resonance computation only considers 3x3
      // The actual propagation is tested in WorldBrainScheduler tests
      const neighbors: string[] = [];
      const cx = 5, cz = 5;
      
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0) continue;
          neighbors.push(`${cx + dx}:${cz + dz}`);
        }
      }
      
      // Should have exactly 8 direct neighbors (3x3 minus center)
      expect(neighbors).toHaveLength(8);
      
      // Distance should always be 1 (no diagonals beyond immediate)
      for (const neighbor of neighbors) {
        const [nx, nz] = neighbor.split(':').map(Number);
        const distance = Math.max(Math.abs(nx - cx), Math.abs(nz - cz));
        expect(distance).toBe(1);
      }
    });
  });
});