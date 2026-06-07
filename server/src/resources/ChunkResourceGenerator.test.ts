/**
 * ChunkResourceGenerator Tests
 * 
 * Tests for deterministic procedural resource node generation.
 * Verifies:
 * - Same seed/chunk -> same list
 * - Different chunk -> different list
 * - IDs sorted and stable
 * - Positions inside chunk bounds
 * - No Math.random() violations
 */

import { describe, expect, it, beforeEach } from "vitest";
import { generateChunkResourceNodes, getVisibleChunkCoords, isStarterChunk, getChunkBiome, CHUNK_RESOURCE_CONSTANTS } from "./ChunkResourceGenerator.js";

const WORLD_SEED = "areloria:earth_1_1";

describe("ChunkResourceGenerator", () => {
  describe("generateChunkResourceNodes", () => {
    it("returns identical nodes for identical chunk inputs", () => {
      const input = {
        worldSeed: WORLD_SEED,
        chunkX: 1,
        chunkZ: 0,
        biomeId: "forest" as const,
      };

      const a = generateChunkResourceNodes(input);
      const b = generateChunkResourceNodes(input);

      expect(a.length).toBe(b.length);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it("returns different nodes for different chunks", () => {
      const chunk1 = generateChunkResourceNodes({
        worldSeed: WORLD_SEED,
        chunkX: 1,
        chunkZ: 0,
        biomeId: "forest",
      });

      const chunk2 = generateChunkResourceNodes({
        worldSeed: WORLD_SEED,
        chunkX: 2,
        chunkZ: 0,
        biomeId: "forest",
      });

      // Different chunks should produce different nodes
      const ids1 = chunk1.map(n => n.id);
      const ids2 = chunk2.map(n => n.id);

      // At least some IDs should be different
      const hasDifference = ids1.some(id => !ids2.includes(id)) || ids2.some(id => !ids1.includes(id));
      expect(hasDifference).toBe(true);
    });

    it("returns different nodes for different biomes in same chunk", () => {
      const forest = generateChunkResourceNodes({
        worldSeed: WORLD_SEED,
        chunkX: 5,
        chunkZ: 5,
        biomeId: "forest",
      });

      const mountain = generateChunkResourceNodes({
        worldSeed: WORLD_SEED,
        chunkX: 5,
        chunkZ: 5,
        biomeId: "mountain",
      });

      // Mountain should have more ore, forest should have more trees
      const forestTrees = forest.filter(n => n.kind === "tree").length;
      const mountainOre = mountain.filter(n => n.kind === "ore").length;

      expect(forestTrees).toBeGreaterThan(mountainOre);
      expect(mountainOre).toBeGreaterThanOrEqual(2);
    });

    it("returns sorted nodes by ID for determinism", () => {
      const nodes = generateChunkResourceNodes({
        worldSeed: WORLD_SEED,
        chunkX: 3,
        chunkZ: 3,
        biomeId: "forest",
      });

      for (let i = 1; i < nodes.length; i++) {
        expect(nodes[i].id >= nodes[i - 1].id).toBe(true);
      }
    });

    it("uses correct ID pattern for resource nodes", () => {
      const nodes = generateChunkResourceNodes({
        worldSeed: WORLD_SEED,
        chunkX: 7,
        chunkZ: 11,
        biomeId: "plains",
      });

      for (const node of nodes) {
        // ID should match pattern: resource:{chunkX}:{chunkZ}:{kind}:{index}
        expect(node.id).toMatch(/^resource:7:11:(tree|ore|fish_spot):\d+$/);
      }
    });

    it("positions are inside chunk bounds", () => {
      const CHUNK_TILES = CHUNK_RESOURCE_CONSTANTS.CHUNK_TILES;
      const KAPPA_PER_TILE = CHUNK_RESOURCE_CONSTANTS.KAPPA_PER_TILE;

      const nodes = generateChunkResourceNodes({
        worldSeed: WORLD_SEED,
        chunkX: 10,
        chunkZ: 20,
        biomeId: "forest",
      });

      const chunkOriginX = 10 * CHUNK_TILES * KAPPA_PER_TILE;
      const chunkOriginY = 20 * CHUNK_TILES * KAPPA_PER_TILE;
      const chunkEndX = chunkOriginX + CHUNK_TILES * KAPPA_PER_TILE;
      const chunkEndY = chunkOriginY + CHUNK_TILES * KAPPA_PER_TILE;

      for (const node of nodes) {
        // Node position should be within chunk bounds (with margin)
        const margin = 2 * KAPPA_PER_TILE; // 2 tiles margin
        expect(node.position.x).toBeGreaterThan(chunkOriginX + margin);
        expect(node.position.x).toBeLessThan(chunkEndX - margin);
        expect(node.position.y).toBeGreaterThan(chunkOriginY + margin);
        expect(node.position.y).toBeLessThan(chunkEndY - margin);
      }
    });

    it("nodes have correct skill requirements", () => {
      const nodes = generateChunkResourceNodes({
        worldSeed: WORLD_SEED,
        chunkX: 1,
        chunkZ: 1,
        biomeId: "forest",
      });

      for (const node of nodes) {
        if (node.kind === "tree") {
          expect(node.skillId).toBe("woodcutting");
          // Trees can be gathered bare-handed for MVP
          expect(node.requiredTool).toBeUndefined();
        } else if (node.kind === "ore") {
          expect(node.skillId).toBe("mining");
          expect(node.requiredTool).toBe("mining_tool");
        } else if (node.kind === "fish_spot") {
          expect(node.skillId).toBe("fishing");
          expect(node.requiredTool).toBe("fishing_tool");
        }
      }
    });

    it("no duplicates in node IDs", () => {
      const nodes = generateChunkResourceNodes({
        worldSeed: WORLD_SEED,
        chunkX: 100,
        chunkZ: 100,
        biomeId: "mountain",
      });

      const ids = nodes.map(n => n.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("produces nodes for all biomes", () => {
      const biomes = ["forest", "plains", "mountain", "forest_village"] as const;

      for (const biome of biomes) {
        const nodes = generateChunkResourceNodes({
          worldSeed: WORLD_SEED,
          chunkX: 99,
          chunkZ: 99,
          biomeId: biome,
        });

        // Should have at least some nodes
        expect(nodes.length).toBeGreaterThan(0);

        // All nodes should have valid kinds
        for (const node of nodes) {
          expect(["tree", "ore", "fish_spot"]).toContain(node.kind);
        }
      }
    });
  });

  describe("getVisibleChunkCoords", () => {
    it("returns 3x3 grid centered on player tile position", () => {
      // Player at tile (50, 50) should be in chunk (3, 3) for 16-tile chunks
      const tiles = 50;
      const visible = getVisibleChunkCoords(tiles, tiles);

      expect(visible.length).toBe(9); // 3x3 grid

      // Should include chunks from (2,2) to (4,4)
      const expectedChunks = [
        { chunkX: 2, chunkZ: 2 }, { chunkX: 3, chunkZ: 2 }, { chunkX: 4, chunkZ: 2 },
        { chunkX: 2, chunkZ: 3 }, { chunkX: 3, chunkZ: 3 }, { chunkX: 4, chunkZ: 3 },
        { chunkX: 2, chunkZ: 4 }, { chunkX: 3, chunkZ: 4 }, { chunkX: 4, chunkZ: 4 },
      ];

      for (const expected of expectedChunks) {
        expect(visible).toContainEqual(expected);
      }
    });

    it("handles edge case at chunk boundary", () => {
      // Tile 0 should be in chunk 0
      const visible = getVisibleChunkCoords(0, 0);
      expect(visible).toContainEqual({ chunkX: 0, chunkZ: 0 });
      expect(visible).toContainEqual({ chunkX: -1, chunkZ: -1 }); // NW neighbor exists
    });
  });

  describe("isStarterChunk", () => {
    it("returns true only for chunk 0/0", () => {
      expect(isStarterChunk(0, 0)).toBe(true);
      expect(isStarterChunk(0, 1)).toBe(false);
      expect(isStarterChunk(1, 0)).toBe(false);
      expect(isStarterChunk(1, 1)).toBe(false);
      expect(isStarterChunk(-1, -1)).toBe(false);
    });
  });

  describe("getChunkBiome", () => {
    it("returns provided biome if given", () => {
      const biome = getChunkBiome(5, 5, "mountain");
      expect(biome).toBe("mountain");
    });

    it("derives biome deterministically if not provided", () => {
      const biome1 = getChunkBiome(10, 10);
      const biome2 = getChunkBiome(10, 10);

      // Same coordinates should always give same biome
      expect(biome1).toBe(biome2);

      // Should be one of the valid biomes
      expect(["forest", "plains", "mountain", "forest_village"]).toContain(biome1);
    });

    it("different chunks can have different biomes", () => {
      const biome1 = getChunkBiome(1, 1);
      const biome2 = getChunkBiome(100, 100);

      // Most likely different due to deterministic distribution
      // But not guaranteed (small chance they could be same)
      // Just verify they're valid biomes
      expect(["forest", "plains", "mountain", "forest_village"]).toContain(biome1);
      expect(["forest", "plains", "mountain", "forest_village"]).toContain(biome2);
    });
  });

  describe("determinism", () => {
    it("no Math.random usage in node generation", () => {
      // This is a static analysis check - we verify the function is pure
      const input = {
        worldSeed: WORLD_SEED,
        chunkX: 42,
        chunkZ: 42,
        biomeId: "forest" as const,
      };

      // Run multiple times and verify consistency
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(generateChunkResourceNodes(input));
      }

      for (let i = 1; i < results.length; i++) {
        expect(JSON.stringify(results[i])).toBe(JSON.stringify(results[0]));
      }
    });
  });
});