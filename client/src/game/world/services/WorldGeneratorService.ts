/**
 * WorldGeneratorService — Procedural world generation pipeline.
 *
 * Creates DynamicTerrain + TreeGenerator instances, wires them into the
 * placement engine, and exposes height queries for physics/navigation.
 *
 * Lifecycle:
 *   await worldGenerator.init(scene, camera)   // creates terrain + trees
 *   worldGenerator.update()                     // call each frame (LOD, streaming)
 *   worldGenerator.dispose()                    // cleanup
 */

import { Scene, Camera, StandardMaterial, Color3, Vector3, Mesh, RawTexture } from "@babylonjs/core";
import {
  type IDynamicTerrain,
} from "../../../lib/babylon-extensions/DynamicTerrain";
import { createTree, createBush, createPine } from "../../../lib/babylon-extensions/TreeGeneratorWrapper";
import { textureCloneService } from "./TextureCloneService.js";
import {
  generateDiamondSquareHeightmap,
  generateDiamondSquareTexture,
  generateChunkHeightmap,
} from "../../../lib/babylon-extensions/DiamondSquareGenerator";

/** Terrain query interface matching the server's TerrainQueryAdapter. */
export interface TerrainQueryAdapter {
  getHeightAt(x: number, y: number): number;
  getSlopeAt(x: number, y: number): number;
  flattenArea(x: number, y: number, width: number, depth: number, targetHeight: number): Promise<void>;
}

// ── Configuration ──────────────────────────────────────────────────────

export interface WorldGeneratorConfig {
  /** World seed for deterministic generation (default: 42) */
  seed: number;
  /** Terrain map width in world units (default: 400) */
  terrainWidth: number;
  /** Terrain map depth in world units (default: 400) */
  terrainDepth: number;
  /** Heightmap subdivisions X (default: 150) */
  terrainSubX: number;
  /** Heightmap subdivisions Z (default: 150) */
  terrainSubZ: number;
  /** DynamicTerrain mesh subdivisions (default: 60) */
  terrainMeshSub: number;
  /** Max terrain amplitude (default: 8) */
  terrainAmplitude: number;
  /** Diamond-square roughness multiplier — lower = rougher (default: 1.2) */
  terrainRoughness: number;
  /** Tree density per 100 sq units (default: 0.8) */
  treeDensity: number;
  /** Max trees total (default: 200) */
  maxTrees: number;
  /** Enable tree generation (default: true) */
  enableTrees: boolean;
  /** Enable terrain (default: true) */
  enableTerrain: boolean;
}

const DEFAULT_CONFIG: WorldGeneratorConfig = {
  seed: 42,
  terrainWidth: 400,
  terrainDepth: 400,
  terrainSubX: 150,
  terrainSubZ: 150,
  terrainMeshSub: 60,
  terrainAmplitude: 8,
  terrainRoughness: 1.2,
  treeDensity: 0.8,
  maxTrees: 200,
  enableTrees: true,
  enableTerrain: true,
};

// ── Seeded PRNG ────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Service ────────────────────────────────────────────────────────────

export class WorldGeneratorService {
  private config: WorldGeneratorConfig;
  private terrain: IDynamicTerrain | null = null;
  private terrainNoiseTexture: RawTexture | null = null;
  private treesByChunk = new Map<string, Mesh[]>();
  private chunkHeightmaps = new Map<string, { data: Float32Array; resolution: number; amplitude: number }>();
  private trunkMaterial: StandardMaterial | null = null;
  private leafMaterial: StandardMaterial | null = null;
  private terrainObserver: any = null;
  private initialized = false;
  private scene: Scene | null = null;
  private totalTreesGenerated = 0;

  constructor(config?: Partial<WorldGeneratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(scene: Scene, camera: Camera): Promise<void> {
    if (this.initialized) return;
    console.log("[WorldGenerator] Starting world generation pipeline...");
    this.scene = scene;

    if (this.config.enableTerrain) {
      await this.initTerrain(scene, camera);
    }

    if (this.config.enableTrees) {
      this.initTreeMaterials(scene);
      // Trees are now generated per-chunk via generateTreesForChunk()
      // Called by WatchdogService when chunks load
    }

    this.initialized = true;
    console.log(
      `[WorldGenerator] Ready: terrain=${this.terrain ? "yes" : "no"}, ` +
      `chunk-based tree streaming active`
    );
  }

  // ── Terrain ──────────────────────────────────────────────────────────

  private async initTerrain(scene: Scene, camera: Camera): Promise<void> {
    console.log("[WorldGenerator] Creating diamond-square terrain...");

    const { DynamicTerrain } = await import("../../../lib/babylon-extensions/DynamicTerrain");

    // Generate heightmap using diamond-square algorithm
    const mapData = generateDiamondSquareHeightmap(
      this.config.terrainSubX,
      this.config.terrainSubZ,
      this.config.terrainWidth,
      this.config.terrainDepth,
      this.config.terrainAmplitude,
      this.config.terrainRoughness,
      this.config.seed
    );

    this.terrain = new DynamicTerrain(
      "world-terrain",
      {
        mapData,
        mapSubX: this.config.terrainSubX,
        mapSubZ: this.config.terrainSubZ,
        terrainSub: this.config.terrainMeshSub,
        camera,
      },
      scene
    );

    // Create terrain material with noise texture for visual detail
    const mat = new StandardMaterial("terrain-mat", scene);
    mat.diffuseColor = new Color3(0.35, 0.48, 0.28);
    mat.specularColor = new Color3(0.03, 0.03, 0.03);

    // Generate and apply noise texture for terrain detail
    const noiseData = generateDiamondSquareTexture(513, this.config.terrainRoughness, this.config.seed);
    this.terrainNoiseTexture = RawTexture.CreateRGBTexture(
      noiseData, 513, 513, scene, true, false, RawTexture.NEAREST_NEAREST
    );
    mat.diffuseTexture = this.terrainNoiseTexture;
    mat.emissiveTexture = this.terrainNoiseTexture;
    mat.emissiveColor = new Color3(0.15, 0.15, 0.1);

    this.terrain.mesh.material = mat;
    this.terrain.computeNormals = true;

    this.terrainObserver = scene.onBeforeRenderObservable.add(() => {
      this.terrain!.update(false);
    });

    console.log(
      `[WorldGenerator] Diamond-square terrain: ${this.config.terrainSubX}x${this.config.terrainSubZ} ` +
      `heightmap (seed=${this.config.seed}, roughness=${this.config.terrainRoughness}), ` +
      `${this.config.terrainWidth}x${this.config.terrainDepth} world units`
    );
  }

  /**
   * Generate terrain data for a specific chunk (for WatchdogService).
   * Caches the heightmap for later height queries.
   */
  generateChunkTerrain(
    chunkX: number,
    chunkZ: number,
    chunkSize: number = 64
  ): { data: Float32Array; resolution: number; amplitude: number } {
    const key = `${chunkX},${chunkZ}`;
    if (this.chunkHeightmaps.has(key)) {
      return this.chunkHeightmaps.get(key)!;
    }

    const chunkData = generateChunkHeightmap(
      chunkX, chunkZ, chunkSize, 65,
      this.config.terrainAmplitude, this.config.seed
    );

    this.chunkHeightmaps.set(key, chunkData);
    return chunkData;
  }

  /**
   * Get height at world position using chunk-based heightmap data.
   */
  getHeightAtChunkPosition(x: number, z: number): number {
    const chunkSize = 64;
    const cx = Math.floor(x / chunkSize);
    const cz = Math.floor(z / chunkSize);
    const key = `${cx},${cz}`;

    const chunkData = this.chunkHeightmaps.get(key);
    if (chunkData) {
      const localX = x - cx * chunkSize;
      const localZ = z - cz * chunkSize;
      const u = (localX / chunkSize) * (chunkData.resolution - 1);
      const v = (localZ / chunkSize) * (chunkData.resolution - 1);

      const x0 = Math.floor(u);
      const z0 = Math.floor(v);
      const x1 = Math.min(x0 + 1, chunkData.resolution - 1);
      const z1 = Math.min(z0 + 1, chunkData.resolution - 1);
      const fx = u - x0;
      const fz = v - z0;

      const data = chunkData.data;
      const res = chunkData.resolution;
      const h00 = data[(z0 * res + x0) * 3 + 1];
      const h10 = data[(z0 * res + x1) * 3 + 1];
      const h01 = data[(z1 * res + x0) * 3 + 1];
      const h11 = data[(z1 * res + x1) * 3 + 1];

      return h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz;
    }

    return this.terrain ? this.terrain.getHeightFromMap(x, z) : 0;
  }

  // ── Chunk-Based Tree Generation ───────────────────────────────────

  private initTreeMaterials(scene: Scene): void {
    this.trunkMaterial = textureCloneService.getMaster(scene, "trunk");
    this.leafMaterial = textureCloneService.getMaster(scene, "leaf");
  }

  /** Deterministic PRNG seeded from chunk coords + world seed. */
  private chunkRand(cx: number, cz: number): () => number {
    // Hash chunk coords into a single seed
    const chunkSeed = (this.config.seed * 73856093) ^ (cx * 19349663) ^ (cz * 83492791);
    return mulberry32(Math.abs(chunkSeed) || 1);
  }

  private chunkKey(cx: number, cz: number): string {
    return `${cx}:${cz}`;
  }

  /**
   * Generate trees for a single chunk. Deterministic — same chunk always produces same trees.
   * Returns the meshes created (also tracked internally for cleanup).
   */
  generateTreesForChunk(cx: number, cz: number): Mesh[] {
    if (!this.scene || !this.trunkMaterial || !this.leafMaterial) return [];

    const key = this.chunkKey(cx, cz);
    if (this.treesByChunk.has(key)) return this.treesByChunk.get(key)!; // Already loaded

    const scene = this.scene;
    const chunkSize = 64; // Must match ChunkService config
    const { treeDensity, terrainAmplitude: amp } = this.config;
    const rand = this.chunkRand(cx, cz);

    // Calculate chunk world bounds
    const chunkMinX = cx * chunkSize;
    const chunkMinZ = cz * chunkSize;
    const chunkArea = (chunkSize * chunkSize) / 100; // area in 100-sq-unit blocks
    const targetCount = Math.min(Math.floor(chunkArea * treeDensity), 8); // Cap per chunk

    const treeTypes = ["tree", "pine", "bush"] as const;
    const trees: Mesh[] = [];
    const positions: Array<{ x: number; z: number }> = [];
    const minSpacing = 5;
    const maxAttempts = targetCount * 5;

    let placed = 0;
    let attempts = 0;

    while (placed < targetCount && attempts < maxAttempts) {
      attempts++;
      // Position within chunk bounds (with 2-unit margin from edges)
      const x = chunkMinX + 2 + rand() * (chunkSize - 4);
      const z = chunkMinZ + 2 + rand() * (chunkSize - 4);

      // Check minimum spacing
      let tooClose = false;
      for (const p of positions) {
        if (Math.hypot(x - p.x, z - p.z) < minSpacing) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      // Get height at this position
      const y = this.terrain ? this.terrain.getHeightFromMap(x, z) : 0;

      // Skip trees on steep slopes
      if (this.terrain) {
        const normal = new Vector3();
        this.terrain.getHeightFromMap(x, z, { normal });
        const slope = Math.acos(Math.max(-1, Math.min(1, normal.y)));
        if (slope > 0.6) continue;
      }

      const type = treeTypes[Math.floor(rand() * treeTypes.length)];
      const scale = 0.6 + rand() * 0.8;
      const rotation = rand() * Math.PI * 2;

      // Clone materials per tree
      const treeId = `chunk-${key}-${placed}`;
      const trunkMat = textureCloneService.clone(scene, "trunk", treeId);
      const leafMat = textureCloneService.clone(scene, "leaf", treeId);

      let tree: Mesh;
      switch (type) {
        case "pine":
          tree = createPine(scene, {
            trunkHeight: 6 + rand() * 4,
            trunkMaterial: trunkMat,
            leafMaterial: leafMat,
          });
          break;
        case "bush":
          tree = createBush(scene, {
            trunkHeight: 1 + rand() * 1,
            trunkMaterial: trunkMat,
            leafMaterial: leafMat,
          });
          break;
        default:
          tree = createTree(scene, {
            trunkHeight: 3 + rand() * 3,
            trunkMaterial: trunkMat,
            leafMaterial: leafMat,
            boughs: rand() > 0.5 ? 2 : 1,
            forks: 2 + Math.floor(rand() * 3),
          });
      }

      tree.position = new Vector3(x, y, z);
      tree.scaling = new Vector3(scale, scale, scale);
      tree.rotation = new Vector3(0, rotation, 0);

      positions.push({ x, z });
      trees.push(tree);
      placed++;
    }

    this.treesByChunk.set(key, trees);
    this.totalTreesGenerated += trees.length;

    if (trees.length > 0) {
      console.log(`[WorldGenerator] Chunk ${key}: ${trees.length} trees loaded`);
    }
    return trees;
  }

  /** Dispose trees for a chunk (when chunk unloads). */
  removeTreesForChunk(cx: number, cz: number): void {
    const key = this.chunkKey(cx, cz);
    const trees = this.treesByChunk.get(key);
    if (!trees) return;

    for (const tree of trees) {
      tree.dispose(false, true);
    }
    this.treesByChunk.delete(key);
    this.totalTreesGenerated -= trees.length;

    if (trees.length > 0) {
      console.log(`[WorldGenerator] Chunk ${key}: ${trees.length} trees unloaded`);
    }
  }

  /** Get total tree count across all loaded chunks. */
  getTotalTreeCount(): number {
    let count = 0;
    for (const trees of this.treesByChunk.values()) {
      count += trees.length;
    }
    return count;
  }

  /** Get list of loaded chunk keys. */
  getLoadedChunkKeys(): string[] {
    return Array.from(this.treesByChunk.keys());
  }

  // ── Terrain Query Adapter ────────────────────────────────────────────

  getTerrainAdapter(): TerrainQueryAdapter | null {
    if (!this.terrain) return null;
    const terrain = this.terrain;
    return {
      getHeightAt(x: number, y: number): number {
        try {
          return terrain.getHeightFromMap(x, y);
        } catch {
          return 0;
        }
      },
      getSlopeAt(x: number, y: number): number {
        const d = 1;
        const h0 = terrain.getHeightFromMap(x, y);
        const hx = terrain.getHeightFromMap(x + d, y);
        const hy = terrain.getHeightFromMap(x, y + d);
        return Math.sqrt(((hx - h0) / d) ** 2 + ((hy - h0) / d) ** 2);
      },
      async flattenArea(x: number, y: number, width: number, depth: number, targetHeight: number): Promise<void> {
        const mapData = terrain.mapData as Float32Array;
        if (!mapData) return;
        const mapSubX = terrain.mapSubX;
        const mapSubZ = terrain.mapSubZ;
        const halfW = width / 2;
        const halfD = depth / 2;
        for (let j = 0; j < mapSubZ; j++) {
          for (let i = 0; i < mapSubX; i++) {
            const idx = (j * mapSubX + i) * 3;
            const px = mapData[idx];
            const pz = mapData[idx + 2];
            if (px >= x - halfW && px <= x + halfW && pz >= y - halfD && pz <= y + halfD) {
              const dist = Math.hypot(px - x, pz - y);
              const maxDist = Math.hypot(halfW, halfD);
              const t = Math.max(0, 1 - dist / maxDist);
              mapData[idx + 1] = mapData[idx + 1] + (targetHeight - mapData[idx + 1]) * t * t;
            }
          }
        }
        terrain.update(true);
      },
    };
  }

  // ── Frame Update ─────────────────────────────────────────────────────

  update(): void {
    if (!this.initialized || !this.terrain) return;
    // Terrain LOD is already handled by the onBeforeRenderObservable in dynamicTerrainExample.ts
    // Future: tree LOD, streaming, etc.
  }

  // ── Stats ────────────────────────────────────────────────────────────

  getStats(): Record<string, unknown> {
    return {
      initialized: this.initialized,
      terrain: this.terrain
        ? {
            width: this.config.terrainWidth,
            depth: this.config.terrainDepth,
            subX: this.config.terrainSubX,
            subZ: this.config.terrainSubZ,
          }
        : null,
      trees: this.getTotalTreeCount(),
      loadedChunks: this.treesByChunk.size,
      totalTreesGenerated: this.totalTreesGenerated,
      seed: this.config.seed,
    };
  }

  // ── Cleanup ──────────────────────────────────────────────────────────

  dispose(): void {
    for (const trees of this.treesByChunk.values()) {
      for (const tree of trees) {
        tree.dispose(false, true);
      }
    }
    this.treesByChunk.clear();
    this.totalTreesGenerated = 0;
    if (this.terrain) {
      this.terrain.mesh.dispose(false, true);
      this.terrain = null;
    }
    // Materials are owned by TextureCloneService — don't dispose here
    this.trunkMaterial = null;
    this.leafMaterial = null;
    this.scene = null;
    this.initialized = false;
    console.log("[WorldGenerator] Disposed.");
  }
}

export const worldGenerator = new WorldGeneratorService();
