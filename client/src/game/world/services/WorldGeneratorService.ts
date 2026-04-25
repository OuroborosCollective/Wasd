import { Scene, Camera, StandardMaterial, Color3, Vector3, Mesh, RawTexture, PhysicsShapeType } from "@babylonjs/core";
import { createTree, createBush, createPine } from "../../../lib/babylon-extensions/TreeGeneratorWrapper";
import { textureCloneService } from "./TextureCloneService.js";
import { physicsService } from "./PhysicsService.js";
import { isAndroid } from "../../../ui/touchUi";

export interface WorldGeneratorConfig {
  seed: number;
  terrainWidth: number;
  terrainDepth: number;
  terrainSubX: number;
  terrainSubZ: number;
  terrainAmplitude: number;
  treeDensity: number;
}

export interface TerrainQueryAdapter {
  getHeightAt(x: number, y: number): number;
  getSlopeAt(x: number, y: number): number;
  flattenArea(x: number, y: number, width: number, depth: number, targetHeight: number): Promise<void>;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * WorldGeneratorService — Procedural world generation pipeline.
 * Manages terrain and foliage (trees, bushes) using chunk-based deterministic generation.
 */
export class WorldGeneratorService {
  private initialized = false;
  private scene: Scene | null = null;
  private terrain: any | null = null;
  private treesByChunk: Map<string, Mesh[]> = new Map();
  private totalTreesGenerated = 0;
  private resonanceByChunk: Map<string, { faith: number; aggression: number; curiosity: number }> = new Map();

  private trunkMaterial: StandardMaterial | null = null;
  private leafMaterial: StandardMaterial | null = null;

  private config: WorldGeneratorConfig = {
    seed: 12345,
    terrainWidth: 1024,
    terrainDepth: 1024,
    terrainSubX: 256,
    terrainSubZ: 256,
    terrainAmplitude: 20,
    treeDensity: 0.5,
  };

  async init(scene: Scene, config?: Partial<WorldGeneratorConfig>): Promise<void> {
    if (this.initialized) return;
    this.scene = scene;
    if (config) this.config = { ...this.config, ...config };

    this.initTreeMaterials(scene);

    const { DynamicTerrain } = await import("../../../lib/babylon-extensions/DynamicTerrain");

    // Procedural Heightmap Generation (Simplex/Perlin fallback)
    const mapSubX = this.config.terrainSubX;
    const mapSubZ = this.config.terrainSubZ;
    const mapData = new Float32Array(mapSubX * mapSubZ * 3);

    for (let l = 0; l < mapSubZ; l++) {
      for (let w = 0; w < mapSubX; w++) {
        const x = (w - mapSubX / 2) * (this.config.terrainWidth / mapSubX);
        const z = (l - mapSubZ / 2) * (this.config.terrainDepth / mapSubZ);

        // Simple multi-octave noise (deterministic based on seed)
        const nx = x / 100;
        const nz = z / 100;
        const seed = this.config.seed;

        let y = Math.sin(nx * 0.5 + seed) * Math.cos(nz * 0.3 + seed) * 5;
        y += Math.sin(nx * 2 + seed * 1.1) * Math.cos(nz * 1.5 + seed * 1.2) * 2;
        y += Math.sin(nx * 5 + seed * 1.3) * Math.cos(nz * 4 + seed * 1.4) * 0.5;

        const idx = (l * mapSubX + w) * 3;
        mapData[idx] = x;
        mapData[idx + 1] = y;
        mapData[idx + 2] = z;
      }
    }

    const terrainParams = {
      mapData,
      mapSubX,
      mapSubZ,
      terrainSub: isAndroid() ? 40 : 80,
    };

    this.terrain = new DynamicTerrain("main-terrain", terrainParams, scene);
    this.terrain.useCustomVertexFunction = true;

    // Register terrain collider with physics engine
    physicsService.addStaticCollider("terrain", this.terrain.mesh, { shape: PhysicsShapeType.MESH });

    this.initialized = true;
    console.log("[WorldGenerator] Initialized.");
  }

  // ── Height Queries ───────────────────────────────────────────────────

  /** Get world height at (x, z) coordinates. */
  getHeightAt(x: number, z: number): number {
    if (this.terrain && this.terrain.mapData) {
      // DynamicTerrain.getHeightFromMap is slightly slow, we can optimize if needed
      // Check if we have chunk-cached data for faster lookups
      const chunkX = Math.floor(x / 64);
      const chunkZ = Math.floor(z / 64);
      const chunkKey = `${chunkX}:${chunkZ}`;

      // Fallback to direct query
      const h = this.terrain.getHeightFromMap(x, z);
      return Number.isFinite(h) ? h : 0;
    }
    return 0;
  }

  // ── Chunk-Based Tree Generation ───────────────────────────────────

  private initTreeMaterials(scene: Scene): void {
    this.trunkMaterial = textureCloneService.getMaster(scene, "trunk");
    this.leafMaterial = textureCloneService.getMaster(scene, "leaf");
  }

  private chunkRand(cx: number, cz: number): () => number {
    const chunkSeed = (this.config.seed * 73856093) ^ (cx * 19349663) ^ (cz * 83492791);
    return mulberry32(Math.abs(chunkSeed) || 1);
  }

  private chunkKey(cx: number, cz: number): string {
    return `${cx}:${cz}`;
  }

  /** Update resonance data received from server. */
  updateResonance(resonance: Record<string, { faith: number; aggression: number; curiosity: number }>): void {
    for (const [key, val] of Object.entries(resonance)) {
      this.resonanceByChunk.set(key, val);
    }
  }

  generateTreesForChunk(cx: number, cz: number): Mesh[] {
    if (!this.scene || !this.trunkMaterial || !this.leafMaterial) return [];

    const key = this.chunkKey(cx, cz);
    if (this.treesByChunk.has(key)) return this.treesByChunk.get(key)!;

    const scene = this.scene;
    const chunkSize = 64;
    const { treeDensity } = this.config;
    const rand = this.chunkRand(cx, cz);

    const chunkMinX = cx * chunkSize;
    const chunkMinZ = cz * chunkSize;
    const chunkArea = (chunkSize * chunkSize) / 100;
    const targetCount = Math.min(Math.floor(chunkArea * treeDensity), 8);

    const treeTypes = ["tree", "pine", "bush"] as const;
    const trees: Mesh[] = [];
    const positions: Array<{ x: number; z: number }> = [];
    const minSpacing = 5;
    const maxAttempts = targetCount * 5;

    // Genetic Resonance Mutations
    const res = this.resonanceByChunk.get(key) || { faith: 0, aggression: 0, curiosity: 0 };

    let placed = 0;
    let attempts = 0;

    while (placed < targetCount && attempts < maxAttempts) {
      attempts++;
      const x = chunkMinX + 2 + rand() * (chunkSize - 4);
      const z = chunkMinZ + 2 + rand() * (chunkSize - 4);

      let tooClose = false;
      for (const p of positions) {
        if (Math.hypot(x - p.x, z - p.z) < minSpacing) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      const y = this.getHeightAt(x, z);

      const type = treeTypes[Math.floor(rand() * treeTypes.length)];
      const scale = 0.6 + rand() * 0.8;
      const rotation = rand() * Math.PI * 2;

      const treeId = `chunk-${key}-${placed}`;
      const trunkMat = textureCloneService.clone(scene, "trunk", treeId) as StandardMaterial;
      const leafMat = textureCloneService.clone(scene, "leaf", treeId) as StandardMaterial;

      // Apply mutations based on resonance
      if (res.faith > 0.5) {
        leafMat.emissiveColor = new Color3(0, 0.5 * res.faith, 1 * res.faith);
        leafMat.specularColor = new Color3(1, 1, 1);
      }
      if (res.aggression > 0.5) {
        leafMat.diffuseColor = Color3.Lerp(leafMat.diffuseColor, new Color3(0.8, 0.1, 0.1), res.aggression);
      }

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
            forks: (2 + Math.floor(rand() * 3)) + Math.floor(res.curiosity * 3),
            trunkTaper: 0.6 + (res.aggression * 0.3),
            branches: 15 + Math.floor(res.curiosity * 20),
          });
      }

      tree.name = treeId;
      tree.position = new Vector3(x, y, z);
      tree.scaling = new Vector3(scale, scale, scale);
      tree.rotation = new Vector3(0, rotation, 0);

      physicsService.addStaticCollider(treeId, tree, { shape: PhysicsShapeType.CAPSULE });
      positions.push({ x, z });
      trees.push(tree);
      placed++;
    }

    this.treesByChunk.set(key, trees);
    this.totalTreesGenerated += trees.length;
    return trees;
  }

  removeTreesForChunk(cx: number, cz: number): void {
    const key = this.chunkKey(cx, cz);
    const trees = this.treesByChunk.get(key);
    if (!trees) return;

    for (const tree of trees) {
      const mesh = tree as Mesh;
      if (mesh.material) {
        const mat = mesh.material as any;
        if (mat.diffuseTexture) mat.diffuseTexture.dispose();
        if (mat.emissiveTexture) mat.emissiveTexture.dispose();
        mat.dispose();
      }
      physicsService.removeBody(tree.name);
      tree.dispose(false, true);
    }
    this.treesByChunk.delete(key);
    this.totalTreesGenerated -= trees.length;
  }

  getTotalTreeCount(): number {
    return this.totalTreesGenerated;
  }

  getLoadedChunkKeys(): string[] {
    return Array.from(this.treesByChunk.keys());
  }

  getTerrainAdapter(): TerrainQueryAdapter | null {
    if (!this.terrain) return null;
    const terrain = this.terrain;
    return {
      getHeightAt(x: number, y: number): number {
        const h = terrain.getHeightFromMap(x, y);
        return Number.isFinite(h) ? h : 0;
      },
      getSlopeAt(x: number, y: number): number {
        const d = 1;
        const h0 = terrain.getHeightFromMap(x, y);
        const hx = terrain.getHeightFromMap(x + d, y);
        const hy = terrain.getHeightFromMap(x, y + d);
        const s = Math.sqrt(((hx - h0) / d) ** 2 + ((hy - h0) / d) ** 2);
        return Number.isFinite(s) ? s : 0;
      },
      async flattenArea(x: number, y: number, width: number, depth: number, targetHeight: number): Promise<void> {
        terrain.update(true);
      },
    };
  }

  update(): void {
    if (!this.initialized || !this.terrain) return;
  }

  getStats(): Record<string, unknown> {
    return {
      initialized: this.initialized,
      trees: this.getTotalTreeCount(),
      loadedChunks: this.treesByChunk.size,
    };
  }

  dispose(): void {
    for (const trees of this.treesByChunk.values()) {
      for (const tree of trees) {
        physicsService.removeBody(tree.name);
        tree.dispose(false, true);
      }
    }
    this.treesByChunk.clear();
    if (this.terrain) {
      physicsService.removeBody(this.terrain.mesh.name);
      this.terrain.mesh.dispose(false, true);
      this.terrain = null;
    }
    this.scene = null;
    this.initialized = false;
  }
}

export const worldGenerator = new WorldGeneratorService();
