/**
 * Tests for AssetBindingDirector prop/tileset/building filtering.
 * 
 * These tests verify that:
 * 1. bindProp only uses props category (not tilesets)
 * 2. tilesets are not returned as prop candidates
 * 3. artifact entries (petals, ground-details, deco) are filtered out
 * 4. bindRoad only uses tilesets (not props)
 * 5. bindBuilding doesn't use cozy-spring props
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetBindingDirector } from '../apps/client-2d/src/world/AssetBindingDirector';
import type { AssetManifest, AssetEntry } from '../apps/client-2d/src/assetManifest';

// Mock manifest with various asset types
const createMockManifest = (): AssetManifest => ({
  version: 3,
  tilesets: {
    'cozy_grass_001': {
      id: 'cozy_grass_001',
      src: '/assets/cozy-spring/tilesets/grass-tiles/files/grass_01.png',
      category: 'tilesets',
      kind: 'grass',
      width: 256,
      height: 256,
      meta: { usableAsTile: true, usableAsProp: false, runtimeRole: 'tileSource' },
    } as AssetEntry,
    'cozy_road_001': {
      id: 'cozy_road_001',
      src: '/assets/cozy-spring/tilesets/stone-paths/files/stone_01.png',
      category: 'tilesets',
      kind: 'road',
      width: 512,
      height: 512,
      meta: { usableAsTile: true, usableAsProp: false, runtimeRole: 'tileSource' },
    } as AssetEntry,
    'graphic_river_grass': {
      id: 'graphic_river_grass',
      src: '/client2d-assets/graphicriver-iso/tiles/grass.png',
      category: 'tilesets',
      kind: 'grass',
      width: 64,
      height: 64,
      meta: { usableAsTile: true, usableAsProp: false, runtimeRole: 'tileSource' },
    } as AssetEntry,
  },
  props: {
    'cozy_tree_001': {
      id: 'cozy_tree_001',
      src: '/assets/cozy-spring/props/cherry-blossom-trees/files/tree_01.png',
      category: 'props',
      kind: 'tree',
      group: 'cherry blossom trees',
      width: 96,
      height: 128,
      meta: { usableAsProp: true, usableAsTile: false, runtimeRole: 'propObject' },
    } as AssetEntry,
    'cozy_bush_001': {
      id: 'cozy_bush_001',
      src: '/assets/cozy-spring/props/bushes-and-shrubs/files/bush_01.png',
      category: 'props',
      kind: 'bush',
      group: 'bushes and shrubs',
      width: 48,
      height: 48,
      meta: { usableAsProp: true, usableAsTile: false, runtimeRole: 'propObject' },
    } as AssetEntry,
    'cozy_flower_001': {
      id: 'cozy_flower_001',
      src: '/assets/cozy-spring/props/flowers-and-plants/files/flower_01.png',
      category: 'props',
      kind: 'flower',
      group: 'flowers and plants',
      width: 32,
      height: 32,
      meta: { usableAsProp: true, usableAsTile: false, runtimeRole: 'propObject' },
    } as AssetEntry,
    // ARTIFACT: These should be filtered out
    'cozy_petal_001': {
      id: 'cozy_petal_001',
      src: '/assets/cozy-spring/props/petals-and-ground-details/files/petal_01.png',
      category: 'props',
      kind: 'deco',
      group: 'petals and ground details',
      sourceName: '10._Petals_and_ground_details.png',
      width: 16,
      height: 16,
      meta: { usableAsProp: true, usableAsTile: false, runtimeRole: 'propObject' },
    } as AssetEntry,
    'cozy_deco_001': {
      id: 'cozy_deco_001',
      src: '/assets/cozy-spring/props/decor-and-homey-items/files/deco_01.png',
      category: 'props',
      kind: 'deco',
      group: 'decor and homey items',
      width: 32,
      height: 32,
      meta: { usableAsProp: true, usableAsTile: false, runtimeRole: 'propObject' },
    } as AssetEntry,
    'cozy_extra_001': {
      id: 'cozy_extra_001',
      src: '/assets/cozy-spring/props/extra-cozy-details/files/extra_01.png',
      category: 'props',
      kind: 'deco',
      group: 'extra cozy details',
      width: 24,
      height: 24,
      meta: { usableAsProp: true, usableAsTile: false, runtimeRole: 'propObject' },
    } as AssetEntry,
    // Valid prop but from wrong path patterns
    'cozy_artifact_nc': {
      id: 'cozy_artifact_nc',
      src: '/assets/cozy-spring/props/flowers-and-plants/files/NC_01.png',
      category: 'props',
      kind: 'flower',
      group: 'flowers and plants',
      sourceName: 'NC_01.png',
      width: 32,
      height: 32,
      meta: { usableAsProp: true, usableAsTile: false, runtimeRole: 'propObject' },
    } as AssetEntry,
    'graphic_river_tree': {
      id: 'graphic_river_tree',
      src: '/client2d-assets/graphicriver-iso/props/tree_01.png',
      category: 'props',
      kind: 'tree',
      group: 'Trees',
      width: 64,
      height: 96,
      meta: { usableAsProp: true, usableAsTile: false, runtimeRole: 'propObject' },
    } as AssetEntry,
  },
  buildings: {
    'gr_house_01': {
      id: 'gr_house_01',
      src: '/client2d-assets/graphicriver-iso/buildings/house_01.png',
      category: 'buildings',
      kind: 'house',
      width: 128,
      height: 128,
      meta: { usableAsProp: false, usableAsTile: false, runtimeRole: 'building' },
    } as AssetEntry,
  },
});

describe('AssetBindingDirector', () => {
  let director: AssetBindingDirector;
  let manifest: AssetManifest;

  beforeEach(() => {
    manifest = createMockManifest();
    director = new AssetBindingDirector(manifest, false);
  });

  describe('bindProp', () => {
    it('should NOT return tilesets as prop candidates', () => {
      const result = director.bindProp('tree', { seed: 'test-seed', biome: 'plains' });
      
      // The bound prop should NOT have a tileset category
      if (result.entry) {
        expect(result.entry.category).not.toBe('tilesets');
      }
    });

    it('should filter out artifacts with petals in sourceName', () => {
      const result = director.bindProp('flower', { seed: 'artifact-filter', biome: 'plains' });
      
      // Should not bind to anything with 'petal' in sourceName
      if (result.entry) {
        const sourceName = (result.entry as any).sourceName || '';
        expect(sourceName.toLowerCase()).not.toContain('petal');
      }
    });

    it('should filter out entries with kind=deco', () => {
      const result = director.bindProp('flower', { seed: 'deco-filter', biome: 'plains' });
      
      // Should not bind to kind='deco'
      if (result.entry) {
        expect(result.entry.kind?.toLowerCase()).not.toBe('deco');
      }
    });

    it('should filter out NC/label artifacts in filename', () => {
      const result = director.bindProp('flower', { seed: 'nc-filter', biome: 'plains' });
      
      // Should not bind to NC artifacts
      if (result.entry) {
        const src = result.entry.src || '';
        const id = result.entry.id || '';
        const combined = (src + id).toLowerCase();
        expect(combined).not.toContain('nc_');
        expect(combined).not.toContain('label');
      }
    });

    it('should return valid props like trees, bushes, flowers', () => {
      const result = director.bindProp('tree', { seed: 'valid-tree', biome: 'plains' });
      
      // Should find a tree prop
      expect(result.entry).toBeDefined();
      expect(result.entry?.kind?.toLowerCase()).toBe('tree');
    });

    it('should filter out entries with width/height < 16 for non-trees', () => {
      // The petal entries have width=16 or less, they should be filtered
      const result = director.bindProp('flower', { seed: 'tiny-filter', biome: 'plains' });
      
      if (result.entry) {
        const width = result.entry.width ?? 0;
        // If it's a flower prop, it should be at least 16x16
        if (result.entry.kind?.toLowerCase() !== 'tree') {
          expect(width).toBeGreaterThanOrEqual(16);
        }
      }
    });
  });

  describe('bindRoad', () => {
    it('should ONLY use tilesets for road binding', () => {
      const result = director.bindRoad('grass', { seed: 'road-test', biome: 'plains' });
      
      // Road binding should return tileset entries
      expect(result.entry).toBeDefined();
      expect(result.entry?.category).toBe('tilesets');
    });

    it('should not return props for road binding', () => {
      const result = director.bindRoad('grass', { seed: 'road-no-props', biome: 'plains' });
      
      // Should not use props for roads
      if (result.entry) {
        expect(result.entry.category).not.toBe('props');
      }
    });

    it('should filter tilesets that are marked usableAsProp=true', () => {
      // Create a manifest with a tileset incorrectly marked as usableAsProp
      const badManifest: AssetManifest = {
        ...manifest,
        tilesets: {
          'bad_tileset': {
            id: 'bad_tileset',
            src: '/test/bad-tileset.png',
            category: 'tilesets',
            kind: 'grass',
            meta: { usableAsTile: true, usableAsProp: true } as any,
          } as AssetEntry,
        },
      };
      const badDirector = new AssetBindingDirector(badManifest, false);
      const result = badDirector.bindRoad('grass', { seed: 'filter-bad', biome: 'plains' });
      
      // Should not bind to the bad tileset
      if (result.entry) {
        expect(result.entry.id).not.toBe('bad_tileset');
      }
    });
  });

  describe('bindBuilding', () => {
    it('should only use buildings category (not props or tilesets)', () => {
      const result = director.bindBuilding('house', { seed: 'building-test' });
      
      // Building binding should use buildings category
      expect(result.entry).toBeDefined();
      // It should either use buildings category or fall back gracefully
      // but NOT use cozy-spring props
      if (result.entry) {
        expect(result.entry.category).not.toBe('props');
        expect(result.entry.src?.toLowerCase()).not.toContain('/props/');
      }
    });

    it('should not use cozy-spring props for buildings', () => {
      const result = director.bindBuilding('house', { seed: 'no-cozy-buildings' });
      
      if (result.entry) {
        // Should not use cozy-spring props as buildings
        expect(result.entry.src?.toLowerCase()).not.toContain('cozy-spring');
        expect(result.entry.src?.toLowerCase()).not.toContain('/props/');
      }
    });
  });
});

describe('Asset category policies', () => {
  it('props should have usableAsProp=true and usableAsTile=false', () => {
    const manifest = createMockManifest();
    for (const [id, entry] of Object.entries(manifest.props || {})) {
      const meta = entry.meta as any;
      if (meta?.runtimeRole === 'propObject') {
        expect(meta.usableAsProp).toBe(true);
        expect(meta.usableAsTile).toBe(false);
      }
    }
  });

  it('tilesets should have usableAsTile=true and usableAsProp=false', () => {
    const manifest = createMockManifest();
    for (const [id, entry] of Object.entries(manifest.tilesets || {})) {
      const meta = entry.meta as any;
      if (meta?.runtimeRole === 'tileSource') {
        expect(meta.usableAsTile).toBe(true);
        expect(meta.usableAsProp).toBe(false);
      }
    }
  });

  it('buildings should NOT be in props or tilesets category', () => {
    const manifest = createMockManifest();
    // Buildings should be in their own category
    expect(manifest.buildings).toBeDefined();
    
    // Ensure no buildings leaked into props
    for (const [id, entry] of Object.entries(manifest.props || {})) {
      expect(entry.category).not.toBe('buildings');
    }
  });
});