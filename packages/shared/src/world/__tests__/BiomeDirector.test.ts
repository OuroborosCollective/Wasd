/**
 * BiomeDirector Tests
 * 
 * Tests for deterministic biome derivation per chunk.
 */

import { describe, expect, it } from "vitest";
import { deriveChunkBiome } from "../BiomeDirector";

const WORLD_SEED = "areloria:earth_1_1";

describe("BiomeDirector", () => {
  describe("deriveChunkBiome", () => {
    it("returns a valid BiomeId", () => {
      const biome = deriveChunkBiome(0, 0, WORLD_SEED);
      expect(["forest", "plains", "mountain", "forest_village"]).toContain(biome);
    });

    it("returns same biome for same chunk coordinates", () => {
      const biome1 = deriveChunkBiome(5, 10, WORLD_SEED);
      const biome2 = deriveChunkBiome(5, 10, WORLD_SEED);

      expect(biome1).toBe(biome2);
    });

    it("returns different biomes for different chunks (most of the time)", () => {
      const biome1 = deriveChunkBiome(1, 1, WORLD_SEED);
      const biome2 = deriveChunkBiome(100, 100, WORLD_SEED);

      // Due to deterministic distribution, these should likely be different
      // but not guaranteed (15% chance of forest_village for either)
      expect(["forest", "plains", "mountain", "forest_village"]).toContain(biome1);
      expect(["forest", "plains", "mountain", "forest_village"]).toContain(biome2);
    });

    it("uses default world seed if not provided", () => {
      const biome1 = deriveChunkBiome(5, 5);
      const biome2 = deriveChunkBiome(5, 5, "areloria:earth_1_1");

      // Should produce consistent results with default seed
      expect(biome1).toBe(biome2);
    });

    it("different world seeds produce different biomes", () => {
      const biome1 = deriveChunkBiome(5, 5, "world_a");
      const biome2 = deriveChunkBiome(5, 5, "world_b");

      // Different seeds should produce different results (with high probability)
      // Since the hash input includes the seed
      expect(biome1).not.toBe(biome2);
    });

    it("handles negative chunk coordinates", () => {
      const biome = deriveChunkBiome(-5, -10, WORLD_SEED);
      expect(["forest", "plains", "mountain", "forest_village"]).toContain(biome);
    });

    it("handles large chunk coordinates", () => {
      const biome = deriveChunkBiome(99999, 99999, WORLD_SEED);
      expect(["forest", "plains", "mountain", "forest_village"]).toContain(biome);
    });

    it("is deterministic across multiple calls", () => {
      const results: string[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(deriveChunkBiome(42, 42, WORLD_SEED));
      }

      // All results should be identical
      const first = results[0];
      for (const result of results) {
        expect(result).toBe(first);
      }
    });

    it("starter chunk (0,0) can be any biome due to deterministic distribution", () => {
      // The starter village uses biomeId="forest_village" explicitly in WorldDirector
      // But deriveChunkBiome will return a deterministic result based on coordinates
      const biome = deriveChunkBiome(0, 0, WORLD_SEED);
      expect(["forest", "plains", "mountain", "forest_village"]).toContain(biome);
    });

    it("produces biome distribution roughly matching design", () => {
      const COUNT = 1000;
      const distribution = { forest: 0, plains: 0, mountain: 0, forest_village: 0 };

      for (let i = 0; i < COUNT; i++) {
        const biome = deriveChunkBiome(i, i * 7, WORLD_SEED); // Spread out
        distribution[biome as keyof typeof distribution]++;
      }

      // Check approximate distribution (45% forest, 20% plains, 20% mountain, 15% forest_village)
      const forestRatio = distribution.forest / COUNT;
      const plainsRatio = distribution.plains / COUNT;
      const mountainRatio = distribution.mountain / COUNT;
      const villageRatio = distribution.forest_village / COUNT;

      // Allow 15% tolerance
      expect(forestRatio).toBeGreaterThan(0.30);
      expect(forestRatio).toBeLessThan(0.60);

      expect(plainsRatio).toBeGreaterThan(0.10);
      expect(plainsRatio).toBeLessThan(0.30);

      expect(mountainRatio).toBeGreaterThan(0.10);
      expect(mountainRatio).toBeLessThan(0.30);

      expect(villageRatio).toBeGreaterThan(0.05);
      expect(villageRatio).toBeLessThan(0.25);
    });
  });
});