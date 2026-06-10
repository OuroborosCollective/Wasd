/**
 * AutonomousResonanceRouter Test Suite
 * 
 * Tests the autonomous resonance scoring algorithm with Stitch assets.
 * Verifies that world state vectors correctly collapse to matching assets.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AutonomousResonanceRouter,
  extractResonanceTagsFromFilename,
  type WorldLogicalState,
  type MaterializationResult,
} from './AutonomousResonanceRouter';

// Mock Stitch assets (simulating what comes from manifest)
const MOCK_STITCH_ASSETS = [
  {
    assetId: 'stitch_enemy_undead_blade_walker_square_sheet',
    category: 'enemy',
    imagePath: 'enemy/stitch_enemy_undead_blade_walker_square_sheet/stitch_enemy_undead_blade_walker_square_sheet.png',
    atlasPath: 'enemy/stitch_enemy_undead_blade_walker_square_sheet/stitch_enemy_undead_blade_walker_square_sheet.atlas.json',
    sourcePath: 'stitch_enemy_undead_blade_walker_square_sheet.jpg',
  },
  {
    assetId: 'stitch_equipment_overlay_crystal_armor_modular_sheet',
    category: 'equipment_overlay',
    imagePath: 'equipment_overlay/stitch_equipment_overlay_crystal_armor_modular_sheet/stitch_equipment_overlay_crystal_armor_modular_sheet.png',
    atlasPath: 'equipment_overlay/stitch_equipment_overlay_crystal_armor_modular_sheet/stitch_equipment_overlay_crystal_armor_modular_sheet.atlas.json',
    sourcePath: 'stitch_equipment_overlay_crystal_armor_modular_sheet.png',
  },
  {
    assetId: 'stitch_npc_eldritch_modular_gothic_assembly_catalog',
    category: 'npc',
    imagePath: 'npc/stitch_npc_eldritch_modular_gothic_assembly_catalog/stitch_npc_eldritch_modular_gothic_assembly_catalog.png',
    atlasPath: 'npc/stitch_npc_eldritch_modular_gothic_assembly_catalog/stitch_npc_eldritch_modular_gothic_assembly_catalog.atlas.json',
    sourcePath: 'stitch_npc_eldritch_modular_gothic_assembly_catalog.png',
  },
  {
    assetId: 'stitch_prop_eldritch_modular_gothic_dungeon_assets_catalog',
    category: 'prop',
    imagePath: 'prop/stitch_prop_eldritch_modular_gothic_dungeon_assets_catalog/stitch_prop_eldritch_modular_gothic_dungeon_assets_catalog.png',
    atlasPath: 'prop/stitch_prop_eldritch_modular_gothic_dungeon_assets_catalog/stitch_prop_eldritch_modular_gothic_dungeon_assets_catalog.atlas.json',
    sourcePath: 'stitch_prop_eldritch_modular_gothic_dungeon_assets_catalog.png',
  },
  {
    assetId: 'stitch_vfx_arelorian_elemental_spell_fx_square_sheet',
    category: 'vfx',
    imagePath: 'vfx/stitch_vfx_arelorian_elemental_spell_fx_square_sheet/stitch_vfx_arelorian_elemental_spell_fx_square_sheet.png',
    atlasPath: 'vfx/stitch_vfx_arelorian_elemental_spell_fx_square_sheet/stitch_vfx_arelorian_elemental_spell_fx_square_sheet.atlas.json',
    sourcePath: 'stitch_vfx_arelorian_elemental_spell_fx_square_sheet.png',
  },
];

describe('AutonomousResonanceRouter', () => {
  let router: AutonomousResonanceRouter;
  
  beforeEach(() => {
    router = new AutonomousResonanceRouter();
    router.loadAssetPool(MOCK_STITCH_ASSETS as any);
  });
  
  describe('Tag Extraction', () => {
    it('should extract tags from Stitch asset filenames', () => {
      const tags = extractResonanceTagsFromFilename('stitch_enemy_undead_blade_walker_square_sheet');
      expect(tags.baseType).toBe('enemy');
      expect(tags.culture).toBe('undead');
      expect(tags.season).toBe('neutral');
    });
    
    it('should extract gothic culture from eldritch assets', () => {
      const tags = extractResonanceTagsFromFilename('stitch_npc_eldritch_modular_gothic_assembly_catalog');
      expect(tags.baseType).toBe('npc');
      expect(tags.culture).toBe('gothic');
      expect(tags.biome).toBe('dungeon');
    });
    
    it('should handle standard naming convention', () => {
      const tags = extractResonanceTagsFromFilename('tree_winter_decay_elf');
      expect(tags.baseType).toBe('tree');
      expect(tags.season).toBe('winter');
      expect(tags.decay).toBe('high');
      expect(tags.culture).toBe('elven');
    });
  });
  
  describe('Resonance Scoring', () => {
    it('should match enemy base type', () => {
      const worldState: WorldLogicalState = {
        baseType: 'enemy',
        season: 'neutral',
        decayLevel: 'none',
        culture: 'undead',
      };
      
      const result = router.materializeEntity(worldState);
      expect(result.assetId).toContain('enemy');
      expect(result.resonanceScore).toBeGreaterThan(0);
    });
    
    it('should NOT match different base types', () => {
      const worldState: WorldLogicalState = {
        baseType: 'tree', // Different from enemy
        season: 'neutral',
        decayLevel: 'none',
        culture: 'universal',
      };
      
      const result = router.materializeEntity(worldState);
      // Should return fallback since no tree assets in pool
      expect(result.fallback).toBe(true);
    });
    
    it('should score culture match higher', () => {
      const worldStateUndead: WorldLogicalState = {
        baseType: 'enemy',
        season: 'neutral',
        decayLevel: 'none',
        culture: 'undead',
      };
      
      const worldStateUniversal: WorldLogicalState = {
        baseType: 'enemy',
        season: 'neutral',
        decayLevel: 'none',
        culture: 'universal',
      };
      
      const resultUndead = router.materializeEntity(worldStateUndead);
      const resultUniversal = router.materializeEntity(worldStateUniversal);
      
      // Undead match should have higher score (culture match = 400 vs universal = 150)
      expect(resultUndead.resonanceScore).toBeGreaterThan(resultUniversal.resonanceScore);
    });
  });
  
  describe('Cost Brake (Caching)', () => {
    it('should cache repeated materializations', () => {
      const worldState: WorldLogicalState = {
        baseType: 'enemy',
        season: 'neutral',
        decayLevel: 'none',
        culture: 'undead',
      };
      
      // First call
      const result1 = router.materializeEntity(worldState);
      // Second call (should hit cache)
      const result2 = router.materializeEntity(worldState);
      
      expect(result1.assetId).toBe(result2.assetId);
      expect(result1.resonanceScore).toBe(result2.resonanceScore);
      
      // Verify cache hit
      const stats = router.getCacheStats();
      expect(stats.size).toBe(1);
    });
    
    it('should clear cache when requested', () => {
      const worldState: WorldLogicalState = {
        baseType: 'enemy',
        season: 'neutral',
        decayLevel: 'none',
        culture: 'undead',
      };
      
      router.materializeEntity(worldState);
      expect(router.getCacheStats().size).toBe(1);
      
      router.clearCache();
      expect(router.getCacheStats().size).toBe(0);
    });
  });
  
  describe('Batch Materialization', () => {
    it('should materialize multiple entities', () => {
      const worldStates: WorldLogicalState[] = [
        { baseType: 'enemy', season: 'neutral', decayLevel: 'none', culture: 'undead' },
        { baseType: 'npc', season: 'neutral', decayLevel: 'none', culture: 'gothic' },
        { baseType: 'vfx', season: 'neutral', decayLevel: 'none', culture: 'universal' },
      ];
      
      const results = router.materializeEntities(worldStates);
      
      expect(results).toHaveLength(3);
      expect(results[0].assetId).toContain('enemy');
      expect(results[1].assetId).toContain('npc');
      expect(results[2].assetId).toContain('vfx');
    });
  });
  
  describe('Match Preview', () => {
    it('should return all matching assets sorted by score', () => {
      const worldState: WorldLogicalState = {
        baseType: 'npc',
        season: 'neutral',
        decayLevel: 'none',
        culture: 'gothic',
        biome: 'dungeon',
      };
      
      const matches = router.getMatchingAssets(worldState);
      
      expect(matches.length).toBeGreaterThan(0);
      // NPC asset should be first (highest score)
      expect(matches[0].asset.assetId).toContain('npc');
      // Verify sorted by score descending
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
      }
    });
  });
});

describe('Integer Math Enforcement', () => {
  it('should only use integer weights for scoring', () => {
    const router = new AutonomousResonanceRouter();
    router.loadAssetPool(MOCK_STITCH_ASSETS as any);
    
    const worldState: WorldLogicalState = {
      baseType: 'enemy',
      season: 'neutral',
      decayLevel: 'none',
      culture: 'undead',
    };
    
    const result = router.materializeEntity(worldState);
    
    // All scores should be integer multiples of base weights
    // BASE_TYPE_MATCH = 1000, CULTURE_MATCH = 400, SEASON_NEUTRAL = 100
    // Expected: 1000 (base) + 400 (culture) + 100 (neutral) = 1500
    expect(result.resonanceScore % 1).toBe(0); // Must be integer
  });
});