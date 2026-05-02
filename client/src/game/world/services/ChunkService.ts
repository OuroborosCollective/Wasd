/**
 * ChunkService — 64x64 world-unit chunk grid management.
 *
 * Determines which chunks to load/unload based on player position.
 * Processes 1 chunk per tick to avoid CPU spikes.
 * Uses distance priority — closer chunks load first.
 *
 * Usage:
 *   chunkService.updatePlayerPosition(camera.position);
 *   const next = chunkService.getNextToLoad();
 */

import { Vector3 } from "@babylonjs/core";
import { isAndroid } from "../../../ui/touchUi";

export interface ChunkCoord {
  x: number;
  z: number;
}

export interface Chunk {
  coord: ChunkCoord;
  state: "unloaded" | "loading" | "loaded" | "buffer";
  objects: ChunkObject[];
  loadOrder: number; // Lower = closer to player, load first
}

export interface ChunkObject {
  id: string;
  type: string;
  localX: number;
  localZ: number;
  glbPath?: string;
  scale?: number;
  rotation?: number;
}

export interface ChunkServiceConfig {
  /** World units per chunk (default: 64) */
  chunkSize: number;
  /** Chunks to keep active in each direction (default: 3 = 7x7 grid) */
  loadRadius: number;
  /** Chunks to keep in memory even if unloaded from view (default: 5 = 11x11) */
  bufferRadius: number;
  /** Max chunks to load per tick (default: 1) */
  loadPerTick: number;
}

const DEFAULT_CONFIG: ChunkServiceConfig = {
  chunkSize: 64,
  loadRadius: 3,
  bufferRadius: 5,
  loadPerTick: 1,
};

export interface ChunkUpdateResult {
  toLoad: ChunkCoord[];
  toUnload: ChunkCoord[];
}

export class ChunkService {
  private config: ChunkServiceConfig;
  private chunks = new Map<string, Chunk>();
  private playerChunk: ChunkCoord = { x: 0, z: 0 };
  private initialized = false;
  private totalLoaded = 0;
  private totalUnloaded = 0;

  constructor(config?: Partial<ChunkServiceConfig>) {
    const android = isAndroid();
    const mobileConfig: Partial<ChunkServiceConfig> = android ? {
      loadRadius: 2,        // 3 → 2 (5x5 → 5x5 grid, but fewer chunks)
      bufferRadius: 3,      // 5 → 3 (smaller buffer)
    } : {};
    
    this.config = { ...DEFAULT_CONFIG, ...mobileConfig, ...config };
  }

  /** Convert world position to chunk coordinate. */
  worldToChunk(wx: number, wz: number): ChunkCoord {
    return {
      x: Math.floor(wx / this.config.chunkSize),
      z: Math.floor(wz / this.config.chunkSize),
    };
  }

  /** Get chunk key for map lookup. */
  private key(cx: number, cz: number): string {
    return `${cx}:${cz}`;
  }

  /** Check if a chunk coordinate is in the active load zone. */
  isActive(cx: number, cz: number): boolean {
    const dx = Math.abs(cx - this.playerChunk.x);
    const dz = Math.abs(cz - this.playerChunk.z);
    return dx <= this.config.loadRadius && dz <= this.config.loadRadius;
  }

  /** Check if a chunk coordinate is in the buffer zone (in memory but not active). */
  isBuffer(cx: number, cz: number): boolean {
    const dx = Math.abs(cx - this.playerChunk.x);
    const dz = Math.abs(cz - this.playerChunk.z);
    return dx <= this.config.bufferRadius && dz <= this.config.bufferRadius;
  }

  /** Update player position and get chunks to load/unload. */
  updatePlayerPosition(worldPos: Vector3): ChunkUpdateResult {
    const newChunk = this.worldToChunk(worldPos.x, worldPos.z);
    const oldChunk = this.playerChunk;

    // If player hasn't changed chunks, no updates needed
    if (newChunk.x === oldChunk.x && newChunk.z === oldChunk.z) {
      return { toLoad: [], toUnload: [] };
    }

    this.playerChunk = newChunk;

    const toLoad: ChunkCoord[] = [];
    const toUnload: ChunkCoord[] = [];

    // Find chunks that should be loaded (in load zone but not loaded)
    for (let dx = -this.config.loadRadius; dx <= this.config.loadRadius; dx++) {
      for (let dz = -this.config.loadRadius; dz <= this.config.loadRadius; dz++) {
        const cx = newChunk.x + dx;
        const cz = newChunk.z + dz;
        const k = this.key(cx, cz);
        const chunk = this.chunks.get(k);

        if (!chunk || chunk.state === "unloaded") {
          toLoad.push({ x: cx, z: cz });
        }
      }
    }

    // Find chunks that should be unloaded (loaded but outside buffer zone)
    for (const [k, chunk] of this.chunks) {
      if (chunk.state === "loaded" || chunk.state === "buffer") {
        if (!this.isBuffer(chunk.coord.x, chunk.coord.z)) {
          toUnload.push({ ...chunk.coord });
        } else if (!this.isActive(chunk.coord.x, chunk.coord.z)) {
          // Move from loaded to buffer state
          chunk.state = "buffer";
        }
      }
    }

    // Sort toLoad by distance to player (closer first)
    toLoad.sort((a, b) => {
      const distA = Math.hypot(a.x - newChunk.x, a.z - newChunk.z);
      const distB = Math.hypot(b.x - newChunk.x, b.z - newChunk.z);
      return distA - distB;
    });

    // Apply unloads
    for (const coord of toUnload) {
      const k = this.key(coord.x, coord.z);
      const chunk = this.chunks.get(k);
      if (chunk) {
        chunk.state = "unloaded";
        chunk.objects = [];
      }
      this.totalUnloaded++;
    }

    // Apply loads (mark as loading, actual content comes from callback)
    for (const coord of toLoad) {
      const k = this.key(coord.x, coord.z);
      if (!this.chunks.has(k)) {
        this.chunks.set(k, {
          coord,
          state: "loading",
          objects: [],
          loadOrder: Math.hypot(coord.x - newChunk.x, coord.z - newChunk.z),
        });
      } else {
        const chunk = this.chunks.get(k)!;
        if (chunk.state === "unloaded") {
          chunk.state = "loading";
        }
      }
    }

    return { toLoad, toUnload };
  }

  /** Get the next chunk that needs loading (1 per tick). */
  getNextToLoad(): ChunkCoord | null {
    let best: Chunk | null = null;
    for (const chunk of this.chunks.values()) {
      if (chunk.state === "loading") {
        if (!best || chunk.loadOrder < best.loadOrder) {
          best = chunk;
        }
      }
    }
    return best ? { ...best.coord } : null;
  }

  /** Mark a chunk as loaded with its objects. */
  markLoaded(cx: number, cz: number, objects: ChunkObject[]): void {
    const k = this.key(cx, cz);
    const chunk = this.chunks.get(k);
    if (chunk) {
      chunk.state = "loaded";
      chunk.objects = objects;
      this.totalLoaded++;
    }
  }

  /** Get chunk data by coordinate. */
  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.key(cx, cz));
  }

  /** Get all currently loaded chunks. */
  getLoadedChunks(): Chunk[] {
    const result: Chunk[] = [];
    for (const chunk of this.chunks.values()) {
      if (chunk.state === "loaded" || chunk.state === "buffer") {
        result.push(chunk);
      }
    }
    return result;
  }

  /** Get all chunks in loading state. */
  getLoadingChunks(): ChunkCoord[] {
    const result: ChunkCoord[] = [];
    for (const chunk of this.chunks.values()) {
      if (chunk.state === "loading") {
        result.push({ ...chunk.coord });
      }
    }
    return result;
  }

  /** Get current player chunk. */
  getPlayerChunk(): ChunkCoord {
    return { ...this.playerChunk };
  }

  /** Get chunk config. */
  getConfig(): ChunkServiceConfig {
    return { ...this.config };
  }

  /** Get stats for debug overlay. */
  getStats(): Record<string, unknown> {
    let active = 0;
    let buffer = 0;
    let loading = 0;
    let unloaded = 0;
    for (const chunk of this.chunks.values()) {
      switch (chunk.state) {
        case "loaded": active++; break;
        case "buffer": buffer++; break;
        case "loading": loading++; break;
        case "unloaded": unloaded++; break;
      }
    }
    return {
      totalChunks: this.chunks.size,
      activeChunks: active,
      bufferChunks: buffer,
      loadingChunks: loading,
      totalLoaded: this.totalLoaded,
      totalUnloaded: this.totalUnloaded,
      playerChunk: this.playerChunk,
      chunkSize: this.config.chunkSize,
      loadRadius: this.config.loadRadius,
    };
  }

  /** Clear all chunks. */
  clear(): void {
    this.chunks.clear();
    this.totalLoaded = 0;
    this.totalUnloaded = 0;
  }

  /** Force-rebuild from scratch (e.g. seed change). */
  reset(): void {
    this.clear();
    this.playerChunk = { x: 0, z: 0 };
  }
}

export const chunkService = new ChunkService();