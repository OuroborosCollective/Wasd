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

import { Scene, Camera, StandardMaterial, Color3, Vector3, Mesh } from "@babylonjs/core";
import {
  type IDynamicTerrain,
} from "../../../lib/babylon-extensions/DynamicTerrain";
import { createTree, createBush, createPine, defaultTrunkMaterial, defaultLeafMaterial } from "../../../lib/babylon-extensions/TreeGeneratorWrapper";

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
  private trees: Mesh[] = [];
  private trunkMaterial: StandardMaterial | null = null;
  private leafMaterial: StandardMaterial | null = null;
  private terrainObserver: any = null;
  private initialized = false;
  private rand: () => number = () => 0;

  constructor(config?: Partial<WorldGeneratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rand = mulberry32(this.config.seed);
  }

  async init(scene: Scene, camera: Camera): Promise<void> {
    if (this.initialized) return;
    console.log("[WorldGenerator] Starting world generation pipeline...");

    this.rand = mulberry32(this.config.seed);

    if (this.config.enableTerrain) {
      await this.initTerrain(scene, camera);
    }

    if (this.config.enableTrees) {
      this.initTreeMaterials(scene);
      this.generateTrees(scene);
    }

    this.initialized = true;
    console.log(
      `[WorldGenerator] World generated: terrain=${this.terrain ? "yes" : "no"}, ` +
      `trees=${this.trees.length}`
    );
  }

  // ── Terrain ──────────────────────────────────────────────────────────

  private async initTerrain(scene: Scene, camera: Camera): Promise<void> {
    console.log("[WorldGenerator] Creating procedural terrain...");

    // Import the DynamicTerrain class directly to use our seeded heightmap
    const { DynamicTerrain } = await import("../../../lib/babylon-extensions/DynamicTerrain");

    const mapData = this.generateSeededHeightmap();

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

    const mat = new StandardMaterial("terrain-mat", scene);
    mat.diffuseColor = new Color3(0.35, 0.48, 0.28);
    mat.specularColor = new Color3(0.03, 0.03, 0.03);
    this.terrain.mesh.material = mat;
    this.terrain.computeNormals = true;

    this.terrainObserver = scene.onBeforeRenderObservable.add(() => {
      this.terrain!.update(false);
    });

    console.log(
      `[WorldGenerator] Terrain created: ${this.config.terrainSubX}x${this.config.terrainSubZ} ` +
      `heightmap, ${this.config.terrainWidth}x${this.config.terrainDepth} world units`
    );
  }

  private generateSeededHeightmap(): Float32Array {
    const { terrainSubX: subX, terrainSubZ: subZ, terrainWidth: w, terrainDepth: d, terrainAmplitude: amp } = this.config;
    const data = new Float32Array(subX * subZ * 3);
    const halfW = w / 2;
    const halfD = d / 2;

    // Multi-octave noise using seeded random
    const rand = this.rand;
    const freq1 = 0.03 + rand() * 0.02;
    const freq2 = 0.08 + rand() * 0.04;
    const freq3 = 0.015 + rand() * 0.01;
    const phase1 = rand() * Math.PI * 2;
    const phase2 = rand() * Math.PI * 2;
    const phase3 = rand() * Math.PI * 2;

    for (let j = 0; j < subZ; j++) {
      for (let i = 0; i < subX; i++) {
        const idx = (j * subX + i) * 3;
        const x = -halfW + (i / (subX - 1)) * w;
        const z = -halfD + (j / (subZ - 1)) * d;

        const y =
          Math.sin(x * freq1 + phase1) * Math.cos(z * freq1 + phase1) * amp +
          Math.sin(x * freq2 + z * freq2 * 0.8 + phase2) * amp * 0.4 +
          Math.sin(x * freq3 + phase3) * amp * 0.8;

        data[idx] = x;
        data[idx + 1] = y;
        data[idx + 2] = z;
      }
    }

    return data;
  }

  // ── Trees ────────────────────────────────────────────────────────────

  private initTreeMaterials(scene: Scene): void {
    this.trunkMaterial = defaultTrunkMaterial(scene);
    this.leafMaterial = defaultLeafMaterial(scene);
  }

  private generateTrees(scene: Scene): void {
    const { terrainWidth: w, terrainDepth: d, treeDensity, maxTrees, terrainAmplitude: amp } = this.config;
    const rand = this.rand;

    const area = (w * d) / 100; // area in 100-sq-unit blocks
    const targetCount = Math.min(Math.floor(area * treeDensity), maxTrees);

    console.log(`[WorldGenerator] Placing up to ${targetCount} trees...`);

    const treeTypes = ["tree", "pine", "bush"] as const;
    let placed = 0;
    let attempts = 0;
    const maxAttempts = targetCount * 5;
    const minSpacing = 4;

    const positions: Array<{ x: number; z: number }> = [];

    while (placed < targetCount && attempts < maxAttempts) {
      attempts++;
      const x = (rand() - 0.5) * w;
      const z = (rand() - 0.5) * d;

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

      // Skip trees on steep slopes or very high peaks
      if (this.terrain) {
        const normal = new Vector3();
        this.terrain.getHeightFromMap(x, z, { normal });
        const slope = Math.acos(Math.max(-1, Math.min(1, normal.y)));
        if (slope > 0.6) continue; // ~34 degrees
      }

      const type = treeTypes[Math.floor(rand() * treeTypes.length)];
      const scale = 0.6 + rand() * 0.8;
      const rotation = rand() * Math.PI * 2;

      let tree: Mesh;
      switch (type) {
        case "pine":
          tree = createPine(scene, {
            trunkHeight: 6 + rand() * 4,
            trunkMaterial: this.trunkMaterial!,
            leafMaterial: this.leafMaterial!,
          });
          break;
        case "bush":
          tree = createBush(scene, {
            trunkHeight: 1 + rand() * 1,
            trunkMaterial: this.trunkMaterial!,
            leafMaterial: this.leafMaterial!,
          });
          break;
        default:
          tree = createTree(scene, {
            trunkHeight: 3 + rand() * 3,
            trunkMaterial: this.trunkMaterial!,
            leafMaterial: this.leafMaterial!,
            boughs: rand() > 0.5 ? 2 : 1,
            forks: 2 + Math.floor(rand() * 3),
          });
      }

      tree.position = new Vector3(x, y, z);
      tree.scaling = new Vector3(scale, scale, scale);
      tree.rotation = new Vector3(0, rotation, 0);

      positions.push({ x, z });
      this.trees.push(tree);
      placed++;
    }

    console.log(`[WorldGenerator] Placed ${placed} trees in ${attempts} attempts`);
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
      trees: this.trees.length,
      seed: this.config.seed,
    };
  }

  // ── Cleanup ──────────────────────────────────────────────────────────

  dispose(): void {
    for (const tree of this.trees) {
      tree.dispose(false, true);
    }
    this.trees = [];
    if (this.terrain) {
      this.terrain.mesh.dispose(false, true);
      this.terrain = null;
    }
    this.trunkMaterial?.dispose();
    this.leafMaterial?.dispose();
    this.trunkMaterial = null;
    this.leafMaterial = null;
    this.initialized = false;
    console.log("[WorldGenerator] Disposed.");
  }
}

export const worldGenerator = new WorldGeneratorService();
