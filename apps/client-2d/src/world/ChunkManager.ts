/**
 * ChunkManager - Deterministic 2D Chunk Streaming
 * 
 * ARCHITECTURE:
 * - Stateless Determinism: Chunks generated via generateChunkScenePlan() from @wasd/shared
 * - Spatial O(1) Lookup: activeChunks Map with key format "chunkX_chunkZ"
 * - Aggressive GC: Mobile-safety via destroy({ children: true }) on chunk exit
 * - Async Cascade: Chunk rendering non-blocking, no 60fps ticker blocks
 * - Context-Aware Binding: Uses AssetBindingContextFactory for semantic asset binding
 * 
 * PILLAR: Client-side autarky. No server queries for static environment data.
 */

import { Container, Graphics, Sprite } from "pixi.js";
import { generateChunkScenePlan, deriveChunkBiome, type ChunkScenePlan } from "@wasd/shared";
import { createWorldPlanAssetBinder } from "./WorldPlanAssetBinder";
import { iso3, TILE_W, TILE_H } from "../isometricProjection";
import type { WorldPlanRenderContext, WorldPlanAssetBinder } from "./WorldPlanRenderTypes";
import type { BindingOptions, LodLevel } from "./AssetBindingContext";
import { buildAllChunkContexts, type ChunkBindingContexts } from "./AssetBindingContextFactory";

/** Chunk coordinate key format: "chunkX_chunkZ" */
type ChunkKey = string;

/** Chunk metadata for position tracking */
interface ChunkEntry {
  container: Container;
  chunkX: number;
  chunkZ: number;
  isDirty: boolean;
  /** Pre-built binding contexts for this chunk (built once, reused) */
  bindingContexts: ChunkBindingContexts;
}

/** Player kappa position input */
interface KappaPosInput {
  x: number;
  z: number;
}

/** World rendering context with asset binder */
interface ChunkRenderContext {
  worldContainer: Container;
  binder: WorldPlanAssetBinder;
  textureFor: (src: string | null | undefined) => ReturnType<WorldPlanAssetBinder["bindRoad"]>["texture"];
  addNpcActor: WorldPlanRenderContext["addNpcActor"];
  width: number;
  height: number;
}

/** ChunkManager configuration */
interface ChunkManagerConfig {
  worldSeed: string;
  biomeId: string;
  chunkTiles: number;
  viewRadius: number;  // 1 = 3x3 grid, 2 = 5x5, etc.
  throttleMs: number;  // Visibility update throttling
  worldTick: number;   // Current world tick (from server manifest, NOT Date.now())
  lod?: LodLevel;      // Level of Detail (default: "medium" for mobile)
}

/** Default configuration */
const DEFAULT_CONFIG: ChunkManagerConfig = {
  worldSeed: "areloria:earth_1_1",
  biomeId: "forest_village",
  chunkTiles: 16,
  viewRadius: 1,  // 3x3 grid
  throttleMs: 500,  // Prevent CPU spikes
  worldTick: 0,  // Will be updated from server manifest
  lod: "medium",  // Mobile-friendly default
};

/**
 * ChunkManager
 * Manages deterministic chunk streaming with O(1) spatial lookup.
 * 
 * Lifecycle:
 * 1. init() - Set up activeChunks map and config
 * 2. updateVisibility(playerKappa) - Call each frame (throttled)
 * 3. destroy() - Cleanup all resources
 */
export class ChunkManager {
  /** O(1) spatial lookup: key "chunkX_chunkZ" → ChunkEntry */
  private readonly activeChunks = new Map<ChunkKey, ChunkEntry>();
  
  /** Configuration */
  private readonly config: ChunkManagerConfig;
  
  /** Render context */
  private ctx: ChunkRenderContext | null = null;
  
  /** Last visibility update timestamp (for throttling) */
  private lastUpdateAt = 0;
  
  /** Currently needed chunk keys (for diffing) */
  private neededKeys: Set<ChunkKey> = new Set();
  
  /** Pending chunk generation promises */
  private pendingGenerations = new Map<ChunkKey, Promise<ChunkEntry | null>>();

  constructor(config: Partial<ChunkManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize ChunkManager with rendering context.
   * Call once during app setup.
   */
  init(ctx: ChunkRenderContext): void {
    this.ctx = ctx;
  }

  /**
   * Update visibility based on player kappa position.
   * THROTTLED: Only processes if throttleMs elapsed since last update.
   * 
   * @param playerKappa - Player's current kappa position { x, z }
   * @param force - Force update even if throttled
   */
  updateVisibility(playerKappa: KappaPosInput, force = false): void {
    const now = performance.now();
    if (!force && now - this.lastUpdateAt < this.config.throttleMs) {
      return;
    }
    this.lastUpdateAt = now;

    if (!this.ctx) {
      console.warn("[ChunkManager] Not initialized. Call init() first.");
      return;
    }

    // Step 1: Calculate player chunk coordinates from kappa
    const playerChunkX = this.kappaToChunk(playerKappa.x);
    const playerChunkZ = this.kappaToChunk(playerKappa.z);

    // Step 2: Generate required 3x3 (or NxN) chunk keys
    this.neededKeys = this.generateNeededKeys(playerChunkX, playerChunkZ);

    // Step 3: Diffing - Create missing chunks
    this.createMissingChunks();

    // Step 4: Diffing - Destroy out-of-range chunks
    this.destroyOutOfRangeChunks();
  }

  /**
   * Convert kappa position to chunk coordinate.
   * Kappa is in millis (e.g., 1000 = 1 grid unit).
   */
  private kappaToChunk(kappa: number): number {
    // Kappa standard: 1 tile = 1000 kappa units
    // Chunk tiles define how many tiles per chunk
    return Math.floor(kappa / (this.config.chunkTiles * 1000));
  }

  /**
   * Generate set of required chunk keys based on player position.
   * Returns (2*viewRadius+1)^2 keys centered on player.
   */
  private generateNeededKeys(centerChunkX: number, centerChunkZ: number): Set<ChunkKey> {
    const keys = new Set<ChunkKey>();
    const { viewRadius } = this.config;
    
    for (let dz = -viewRadius; dz <= viewRadius; dz++) {
      for (let dx = -viewRadius; dx <= viewRadius; dx++) {
        const chunkX = centerChunkX + dx;
        const chunkZ = centerChunkZ + dz;
        keys.add(this.chunkKey(chunkX, chunkZ));
      }
    }
    
    return keys;
  }

  /**
   * Create chunk key string from coordinates.
   */
  private chunkKey(chunkX: number, chunkZ: number): ChunkKey {
    return `${chunkX}_${chunkZ}`;
  }

  /**
   * Parse chunk key into coordinates.
   */
  private parseChunkKey(key: ChunkKey): { chunkX: number; chunkZ: number } {
    const [cx, cz] = key.split("_").map(Number);
    return { chunkX: cx, chunkZ: cz };
  }

  /**
   * Diffing: Create chunks that are needed but not active.
   */
  private createMissingChunks(): void {
    if (!this.ctx) return;

    for (const key of this.neededKeys) {
      if (this.activeChunks.has(key)) continue;
      if (this.pendingGenerations.has(key)) continue;

      // Start async chunk generation
      const { chunkX, chunkZ } = this.parseChunkKey(key);
      const genPromise = this.generateChunk(chunkX, chunkZ);
      
      this.pendingGenerations.set(key, genPromise);
      
      // Handle async result (non-blocking)
      genPromise.then((entry) => {
        this.pendingGenerations.delete(key);
        if (entry && this.neededKeys.has(key)) {
          this.activeChunks.set(key, entry);
          this.ctx!.worldContainer.addChild(entry.container);
        }
      }).catch((err) => {
        this.pendingGenerations.delete(key);
        console.warn(`[ChunkManager] Chunk generation failed for ${key}:`, err);
      });
    }
  }

  /**
   * Diffing: Remove chunks that are no longer needed.
   */
  private destroyOutOfRangeChunks(): void {
    for (const [key, entry] of this.activeChunks) {
      if (this.neededKeys.has(key)) continue;

      // Remove from world container
      this.ctx?.worldContainer.removeChild(entry.container);
      
      // Aggressive GC: destroy all children
      // NOTE: Textures from atlas are NOT destroyed - they're shared assets
      entry.container.destroy({ children: true });
      
      this.activeChunks.delete(key);
    }
  }

  /**
   * Generate a deterministic chunk plan and render it.
   * ASYNC: Non-blocking chunk generation.
   * Uses context-aware asset binding for semantic, biome-adaptive visuals.
   */
  private async generateChunk(chunkX: number, chunkZ: number): Promise<ChunkEntry | null> {
    if (!this.ctx) return null;

    // Generate deterministic chunk plan using shared logic
    // Derive biome per chunk for deterministic variation outside starter village
    const derivedBiome = deriveChunkBiome(chunkX, chunkZ, this.config.worldSeed);
    const plan = generateChunkScenePlan({
      worldSeed: this.config.worldSeed,
      chunkX,
      chunkZ,
      biomeId: derivedBiome as any,
      kappa: 1000,
      chunkTiles: this.config.chunkTiles,
    });

    // BUILD CONTEXT ONCE PER CHUNK (not per frame!)
    // This is the key performance optimization for semantic asset binding.
    const chunkMetadata = {
      chunkX,
      chunkZ,
      biomeId: derivedBiome,
    };
    const worldState = {
      worldTick: this.config.worldTick,
      worldSeed: this.config.worldSeed,
    };
    const bindingContexts = buildAllChunkContexts(
      chunkMetadata,
      worldState,
      plan,
      undefined, // settlement context - can be extended later
      { forceLod: this.config.lod },
    );

    // Create chunk container
    const chunkContainer = new Container();
    chunkContainer.sortableChildren = true;

    // Create sub-containers for layers (terrain, props, actors)
    const terrain = new Container();
    const roads = new Container();
    const buildings = new Container();
    const props = new Container();
    const actors = new Container();

    terrain.sortableChildren = true;
    roads.sortableChildren = true;
    buildings.sortableChildren = true;
    props.sortableChildren = true;
    actors.sortableChildren = true;

    // Position chunk at isometric grid coordinates
    // Each chunk occupies chunkTiles x chunkTiles tiles
    const chunkPixelX = chunkX * this.config.chunkTiles * TILE_W;
    const chunkPixelZ = chunkZ * this.config.chunkTiles * TILE_H;
    
    // For isometric, we calculate the screen position of chunk origin
    const originScreen = iso3({
      gridX: chunkX * this.config.chunkTiles,
      gridZ: chunkZ * this.config.chunkTiles,
      screenWidth: this.ctx.width,
      screenHeight: this.ctx.height,
      tileWidth: TILE_W,
      tileHeight: TILE_H,
      height: 0,
    });
    
    chunkContainer.x = originScreen.x;
    chunkContainer.y = originScreen.y;

    // Render terrain (no binding needed for simple tiles)
    // Use screen position y-value for proper isometric depth sorting
    for (const cell of plan.terrain) {
      const tileGraphic = this.createTerrainTile(cell.terrainType);
      const screenPos = iso3({
        gridX: cell.tileX,
        gridZ: cell.tileZ,
        screenWidth: this.ctx.width,
        screenHeight: this.ctx.height,
        tileWidth: TILE_W,
        tileHeight: TILE_H,
        height: 0,
      });
      tileGraphic.x = screenPos.x - originScreen.x;
      tileGraphic.y = screenPos.y - originScreen.y;
      // Use screen position y for proper isometric depth sorting
      // Subtract small offset to ensure terrain renders behind entities at same depth
      tileGraphic.zIndex = Math.floor(screenPos.y - 1);
      terrain.addChild(tileGraphic);
    }

    // Render roads with context-aware binding
    // Use screen position y-value for proper isometric depth sorting
    for (const [roadCell] of Object.entries(plan.roads.roadCells)) {
      const [xRaw, zRaw] = roadCell.split(":");
      const roadKey = `${xRaw}:${zRaw}`;
      
      // Get pre-built road context (deterministic, pre-computed)
      const roadContext = bindingContexts.roadContexts.get(roadKey);
      
      // Use context-aware binding for biome-adaptive roads
      const tileGraphic = this.createRoadTile();
      const screenPos = iso3({
        gridX: Number(xRaw),
        gridZ: Number(zRaw),
        screenWidth: this.ctx.width,
        screenHeight: this.ctx.height,
        tileWidth: TILE_W,
        tileHeight: TILE_H,
        height: 0,
      });
      tileGraphic.x = screenPos.x - originScreen.x;
      tileGraphic.y = screenPos.y - originScreen.y;
      // Use screen position y for proper isometric depth sorting
      tileGraphic.zIndex = Math.floor(screenPos.y);
      roads.addChild(tileGraphic);
    }

    // Render settlement buildings with context-aware binding
    for (const lot of plan.settlement.lots) {
      // Get pre-built building context (deterministic, pre-computed)
      const buildingContext = bindingContexts.buildingContexts.get(lot.id);
      
      // Use context-aware binding for biome/culture-adaptive buildings
      const bound = buildingContext
        ? this.ctx.binder.bindBuildingWithContext(lot.buildingType, buildingContext)
        : this.ctx.binder.bindBuilding(lot.buildingType, lot.id);
      
      const buildingNode = this.createBuildingNode(bound);
      const screenPos = iso3({
        gridX: lot.tileX + lot.widthTiles / 2,
        gridZ: lot.tileZ + lot.depthTiles / 2,
        screenWidth: this.ctx.width,
        screenHeight: this.ctx.height,
        tileWidth: TILE_W,
        tileHeight: TILE_H,
        height: 0,
      });
      buildingNode.x = screenPos.x - originScreen.x;
      buildingNode.y = screenPos.y - originScreen.y;
      buildingNode.zIndex = screenPos.zIndex;
      buildings.addChild(buildingNode);
    }

    // Render props with context-aware binding
    for (const prop of [...plan.settlement.props, ...plan.props]) {
      // Get pre-built prop context (deterministic, pre-computed)
      const propContext = bindingContexts.propContexts.get(prop.id);
      
      // Use context-aware binding for biome-adaptive props (trees, bushes)
      const bound = propContext
        ? this.ctx.binder.bindPropWithContext(prop.propType, propContext)
        : this.ctx.binder.bindProp(prop.propType, prop.id);
      
      const propNode = this.createPropNode(bound);
      const screenPos = iso3({
        gridX: prop.tileX,
        gridZ: prop.tileZ,
        screenWidth: this.ctx.width,
        screenHeight: this.ctx.height,
        tileWidth: TILE_W,
        tileHeight: TILE_H,
        height: 0,
      });
      propNode.x = screenPos.x - originScreen.x;
      propNode.y = screenPos.y - originScreen.y;
      propNode.zIndex = screenPos.zIndex;
      props.addChild(propNode);
    }

    // Add all layers to chunk container
    chunkContainer.addChild(terrain);
    chunkContainer.addChild(roads);
    chunkContainer.addChild(buildings);
    chunkContainer.addChild(props);
    chunkContainer.addChild(actors);

    return {
      container: chunkContainer,
      chunkX,
      chunkZ,
      isDirty: false,
      bindingContexts,  // Store contexts for potential re-render
    };
  }

  /**
   * Create terrain tile graphic (diamond shape).
   */
  private createTerrainTile(terrainType: string): Graphics {
    const g = new Graphics();
    const color = terrainType === "road_edge" ? 0x705333 
      : terrainType === "stone" ? 0x59615f 
      : terrainType === "forest_floor" ? 0x345f3e 
      : 0x3f7f48;
    
    g.moveTo(0, -TILE_H / 2);
    g.lineTo(TILE_W / 2, 0);
    g.lineTo(0, TILE_H / 2);
    g.lineTo(-TILE_W / 2, 0);
    g.closePath();
    g.fill(color);
    
    return g;
  }

  /**
   * Create road tile graphic.
   */
  private createRoadTile(): Graphics {
    const g = new Graphics();
    g.moveTo(0, -TILE_H / 2 + 8);
    g.lineTo(TILE_W / 2 - 10, 0);
    g.lineTo(0, TILE_H / 2 - 8);
    g.lineTo(-TILE_W / 2 + 10, 0);
    g.closePath();
    g.fill({ color: 0x87633f, alpha: 0.94 });
    g.stroke({ width: 1, color: 0xc79d64, alpha: 0.35 });
    return g;
  }

  /**
   * Create building node from bound asset.
   */
  private createBuildingNode(bound: ReturnType<WorldPlanAssetBinder["bindBuilding"]>): Container {
    const c = new Container();
    
    if (bound.texture && bound.entry) {
      const sprite = new Sprite(bound.texture);
      sprite.anchor.set(0.5, 1);
      sprite.width = 176;
      sprite.height = 180;
      c.addChild(sprite);
    } else {
      // Fallback building graphic
      c.addChild(new Graphics().ellipse(0, 30, 76, 18).fill({ color: 0x030804, alpha: 0.5 }));
      const body = new Graphics().roundRect(-58, -72, 116, 92, 10).fill(0x7d5534);
      c.addChild(body);
      const roof = new Graphics();
      roof.moveTo(-72, -68);
      roof.lineTo(0, -128);
      roof.lineTo(72, -68);
      roof.lineTo(52, -42);
      roof.lineTo(-52, -42);
      roof.closePath();
      roof.fill(0x8e2c2b);
      c.addChild(roof);
    }
    
    return c;
  }

  /**
   * Create prop node from bound asset.
   */
  private createPropNode(bound: ReturnType<WorldPlanAssetBinder["bindProp"]>): Container {
    const c = new Container();
    const size = bound.semanticType === "tree" ? { w: 94, h: 128 } 
      : bound.semanticType === "market_stall" ? { w: 112, h: 82 }
      : { w: 54, h: 54 };
    
    if (bound.texture && bound.entry) {
      const sprite = new Sprite(bound.texture);
      sprite.anchor.set(0.5, 1);
      sprite.width = size.w;
      sprite.height = size.h;
      c.addChild(sprite);
    } else {
      // Fallback prop (circle for tree-like props)
      const color = bound.semanticType === "tree" ? 0x2f8d4d : 0x4a7a3a;
      c.addChild(new Graphics().circle(0, -18, size.w / 3).fill(color));
    }
    
    return c;
  }

  /**
   * Get count of active chunks (for debugging/metrics).
   */
  getActiveChunkCount(): number {
    return this.activeChunks.size;
  }

  /**
   * Check if a specific chunk is loaded.
   */
  hasChunk(chunkX: number, chunkZ: number): boolean {
    return this.activeChunks.has(this.chunkKey(chunkX, chunkZ));
  }

  /**
   * Get the biome ID for a specific chunk coordinate.
   * Useful for debugging which biome a chunk has.
   */
  getChunkBiome(chunkX: number, chunkZ: number): string {
    return deriveChunkBiome(chunkX, chunkZ, this.config.worldSeed);
  }

  /**
   * Get the world seed used by this ChunkManager.
   */
  getWorldSeed(): string {
    return this.config.worldSeed;
  }

  /**
   * Get all active chunk keys as an array.
   * Useful for debugging.
   */
  getActiveChunkKeys(): string[] {
    return Array.from(this.activeChunks.keys());
  }

  /**
   * Cleanup all resources.
   * Call on app destroy.
   */
  destroy(): void {
    for (const [key, entry] of this.activeChunks) {
      this.ctx?.worldContainer.removeChild(entry.container);
      entry.container.destroy({ children: true });
    }
    this.activeChunks.clear();
    this.pendingGenerations.clear();
    this.neededKeys.clear();
    this.ctx = null;
  }
}