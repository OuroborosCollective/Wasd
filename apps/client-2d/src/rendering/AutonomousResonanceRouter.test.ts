/**
 * AutonomousResonanceRouter Test Suite
 *
 * Tests deterministic observer-side asset binding with accepted Stitch assets.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  AutonomousResonanceRouter,
  extractResonanceTagsFromFilename,
  type MaterializationResult,
  type WorldLogicalState,
} from "./AutonomousResonanceRouter";
import type { StitchAssetCategory, StitchRuntimeAsset } from "../game/stitchAssetManifest";

function mockAsset(
  assetId: string,
  category: StitchAssetCategory,
  tags: readonly string[] = [],
): StitchRuntimeAsset {
  return {
    assetId,
    category,
    displayName: assetId.replace(/_/g, " "),
    sourcePath: `${assetId}.png`,
    imagePath: `${category}/${assetId}/${assetId}.png`,
    atlasPath: `${category}/${assetId}/${assetId}.atlas.json`,
    previewPath: `${category}/${assetId}/${assetId}.preview.png`,
    width: 1536,
    height: 1536,
    frameWidth: 128,
    frameHeight: 128,
    columns: 6,
    rows: 6,
    frameCount: 36,
    pivot: { x: 0.5, y: 0.5 },
    tags,
    sourceSha256: `${assetId}_source_sha`,
    processedSha256: `${assetId}_processed_sha`,
    status: "accepted",
  };
}

const MOCK_STITCH_ASSETS: readonly StitchRuntimeAsset[] = Object.freeze([
  mockAsset("stitch_enemy_undead_blade_walker_6x6_256", "enemy", ["enemy", "undead", "blade", "walker"]),
  mockAsset("stitch_equipment_overlay_crystal_armor_6x6_256", "equipment_overlay", ["equipment_overlay", "crystal", "armor"]),
  mockAsset("stitch_npc_eldritch_modular_gothic_assembly", "npc", ["npc", "eldritch", "gothic", "dungeon"]),
  mockAsset("stitch_building_fantasy_stone_village_house", "building", ["building", "village", "stone", "settlement"]),
  mockAsset("stitch_prop_eldritch_modular_gothic_dungeon_assets", "prop", ["prop", "eldritch", "gothic", "dungeon"]),
  mockAsset("stitch_vfx_arelorian_elemental_spell_fx_6x6_256", "vfx", ["vfx", "arelorian", "elemental", "spell"]),
]);

describe("AutonomousResonanceRouter", () => {
  let router: AutonomousResonanceRouter;

  beforeEach(() => {
    router = new AutonomousResonanceRouter();
    router.loadAssetPool(MOCK_STITCH_ASSETS);
  });

  describe("tag extraction", () => {
    it("extracts undead culture from Stitch enemy filenames", () => {
      const tags = extractResonanceTagsFromFilename("stitch_enemy_undead_blade_walker_6x6_256");

      expect(tags.baseType).toBe("enemy");
      expect(tags.culture).toBe("undead");
      expect(tags.season).toBe("neutral");
    });

    it("extracts gothic culture and dungeon biome from eldritch assets", () => {
      const tags = extractResonanceTagsFromFilename("stitch_npc_eldritch_modular_gothic_dungeon_assembly");

      expect(tags.baseType).toBe("npc");
      expect(tags.culture).toBe("gothic");
      expect(tags.biome).toBe("dungeon");
    });

    it("handles standard non-Stitch naming", () => {
      const tags = extractResonanceTagsFromFilename("tree_winter_decay_elf");

      expect(tags.baseType).toBe("tree");
      expect(tags.season).toBe("winter");
      expect(tags.decay).toBe("high");
      expect(tags.culture).toBe("elven");
    });
  });

  describe("resonance scoring", () => {
    it("matches enemy base type and undead culture", () => {
      const worldState: WorldLogicalState = {
        baseType: "enemy",
        season: "neutral",
        decayLevel: "none",
        culture: "undead",
      };

      const result = router.materializeEntity(worldState);

      expect(result.assetId).toBe("stitch_enemy_undead_blade_walker_6x6_256");
      expect(result.resonanceScore).toBeGreaterThan(0);
      expect(result.fallback).toBe(false);
    });

    it("returns fallback when no positive base-type resonance exists", () => {
      const worldState: WorldLogicalState = {
        baseType: "tree",
        season: "neutral",
        decayLevel: "none",
        culture: "universal",
      };

      const result = router.materializeEntity(worldState);

      expect(result.fallback).toBe(true);
      expect(result.resonanceScore).toBe(0);
    });

    it("scores a direct culture match higher than universal fallback", () => {
      const direct = router.materializeEntity({
        baseType: "enemy",
        season: "neutral",
        decayLevel: "none",
        culture: "undead",
      });

      const universal = router.materializeEntity({
        baseType: "enemy",
        season: "neutral",
        decayLevel: "none",
        culture: "universal",
      });

      expect(direct.resonanceScore).toBeGreaterThan(universal.resonanceScore);
    });

    it("supports building assets as accepted runtime candidates", () => {
      const result = router.materializeEntity({
        baseType: "building",
        season: "neutral",
        decayLevel: "none",
        culture: "universal",
        environment: "settlement",
      });

      expect(result.assetId).toBe("stitch_building_fantasy_stone_village_house");
      expect(result.fallback).toBe(false);
    });

    it("supports vfx as vfx instead of remapping it to generic effect", () => {
      const result = router.materializeEntity({
        baseType: "vfx",
        season: "neutral",
        decayLevel: "none",
        culture: "arelorian",
      });

      expect(result.assetId).toBe("stitch_vfx_arelorian_elemental_spell_fx_6x6_256");
      expect(result.fallback).toBe(false);
    });

    it("breaks score ties deterministically by assetId", () => {
      const tieRouter = new AutonomousResonanceRouter();
      tieRouter.loadAssetPool([
        mockAsset("stitch_enemy_undead_zeta", "enemy", ["enemy", "undead"]),
        mockAsset("stitch_enemy_undead_alpha", "enemy", ["enemy", "undead"]),
      ]);

      const result = tieRouter.materializeEntity({
        baseType: "enemy",
        season: "neutral",
        decayLevel: "none",
        culture: "undead",
      });

      expect(result.assetId).toBe("stitch_enemy_undead_alpha");
    });
  });

  describe("cache brake", () => {
    it("caches repeated materializations", () => {
      const worldState: WorldLogicalState = {
        baseType: "enemy",
        season: "neutral",
        decayLevel: "none",
        culture: "undead",
      };

      const result1 = router.materializeEntity(worldState);
      const result2 = router.materializeEntity(worldState);

      expect(result1.assetId).toBe(result2.assetId);
      expect(result1.resonanceScore).toBe(result2.resonanceScore);
      expect(router.getCacheStats().size).toBe(1);
    });

    it("clears cache when requested", () => {
      router.materializeEntity({
        baseType: "enemy",
        season: "neutral",
        decayLevel: "none",
        culture: "undead",
      });

      expect(router.getCacheStats().size).toBe(1);

      router.clearCache();
      expect(router.getCacheStats().size).toBe(0);
    });
  });

  describe("batch materialization", () => {
    it("materializes multiple entities", () => {
      const worldStates: readonly WorldLogicalState[] = [
        { baseType: "enemy", season: "neutral", decayLevel: "none", culture: "undead" },
        { baseType: "npc", season: "neutral", decayLevel: "none", culture: "gothic", biome: "dungeon" },
        { baseType: "vfx", season: "neutral", decayLevel: "none", culture: "arelorian" },
      ];

      const results = router.materializeEntities(worldStates);

      expect(results).toHaveLength(3);
      expect(results[0]?.assetId).toContain("enemy");
      expect(results[1]?.assetId).toContain("npc");
      expect(results[2]?.assetId).toContain("vfx");
    });
  });

  describe("match preview", () => {
    it("returns matching assets sorted by score then assetId", () => {
      const worldState: WorldLogicalState = {
        baseType: "npc",
        season: "neutral",
        decayLevel: "none",
        culture: "gothic",
        biome: "dungeon",
      };

      const matches = router.getMatchingAssets(worldState);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]?.asset.assetId).toContain("npc");

      for (let index = 1; index < matches.length; index += 1) {
        const previous = matches[index - 1];
        const current = matches[index];
        expect(previous?.score ?? 0).toBeGreaterThanOrEqual(current?.score ?? 0);
      }
    });
  });
});

describe("Integer Math Enforcement", () => {
  it("only uses integer scores", () => {
    const router = new AutonomousResonanceRouter();
    router.loadAssetPool(MOCK_STITCH_ASSETS);

    const result: MaterializationResult = router.materializeEntity({
      baseType: "enemy",
      season: "neutral",
      decayLevel: "none",
      culture: "undead",
    });

    expect(result.resonanceScore % 1).toBe(0);
  });
});

describe("sorting performance benchmark", () => {
  it("benchmarks fast relational comparison vs localeCompare for ResonanceAsset sorting", () => {
    const sampleAssets: Array<{ assetId: string; category: string; path: string }> = [];
    const categories = ["enemy", "npc", "building", "prop", "vfx", "tile"];
    for (let i = 0; i < 2000; i++) {
      const idNum = String(i % 500).padStart(4, "0");
      const category = categories[i % categories.length]!;
      sampleAssets.push({
        assetId: `stitch_${category}_asset_${idNum}`,
        category,
        path: `/2d-assets/stitch/${category}_${idNum}.png`,
      });
    }

    // 1. Benchmark legacy localeCompare sorting
    const itemsForLocale = [...sampleAssets];
    const startLocale = performance.now();
    for (let iter = 0; iter < 10; iter++) {
      itemsForLocale.sort(
        (a, b) =>
          a.assetId.localeCompare(b.assetId) ||
          a.category.localeCompare(b.category) ||
          a.path.localeCompare(b.path),
      );
    }
    const durationLocale = performance.now() - startLocale;

    // 2. Benchmark fast relational sorting
    const itemsForRelational = [...sampleAssets];
    const startRelational = performance.now();
    for (let iter = 0; iter < 10; iter++) {
      itemsForRelational.sort((a, b) => {
        if (a.assetId !== b.assetId) return a.assetId < b.assetId ? -1 : 1;
        if (a.category !== b.category) return a.category < b.category ? -1 : 1;
        if (a.path !== b.path) return a.path < b.path ? -1 : 1;
        return 0;
      });
    }
    const durationRelational = performance.now() - startRelational;

    // Ensure identical sort order
    expect(itemsForRelational).toEqual(itemsForLocale);

    const speedup = durationLocale / (durationRelational || 0.001);
    console.log(`\n⚡ AutonomousResonanceRouter Sort Benchmark (2000 items, 10 iterations):`);
    console.log(`  - localeCompare sort:    ${durationLocale.toFixed(4)}ms`);
    console.log(`  - fast relational sort:  ${durationRelational.toFixed(4)}ms`);
    console.log(`  - Speedup factor:        ${speedup.toFixed(2)}x faster\n`);

    expect(speedup).toBeGreaterThan(1.0);
  });
});
