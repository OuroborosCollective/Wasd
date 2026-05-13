/**
 * TrafficResonance - Urban Foot Traffic Simulation
 * 
 * Uses TraitResonanceEngine (64x64 chunks) for pedestrian flow simulation.
 * Calculates density_avg deterministically per tick.
 * Broadcasts heatmap data to clients via broadcastChunkResonance.
 * 
 * Features:
 * - 64x64 chunk grid (TraitResonanceEngine)
 * - Deterministic density calculation
 * - Per-tick aggregation (CPU optimization)
 * - Client broadcast via broadcastChunkResonance
 * - Zero per-entity CPU load after aggregation
 */

import { TraitResonanceEngine, TraitResonance } from "./TraitResonanceEngine";

/** Traffic entity in simulation */
export interface TrafficEntity {
  id: string;
  x: number;
  y: number;
  velocity?: { x: number; y: number };
  timestamp: number;
}

/** Chunk density data */
export interface ChunkDensity {
  chunkKey: string;
  density_avg: number;
  entityCount: number;
  maxCapacity: number;
  flow_intensity: number;
  timestamp: number;
}

/** Traffic heatmap broadcast */
export interface TrafficHeatmapBroadcast {
  type: 'chunk_density';
  chunkKey: string;
  density_avg: number;
  entityCount: number;
  flow_intensity: number;
  timestamp: number;
}

/** Grid configuration */
export interface GridConfig {
  width: number;
  height: number;
  maxCapacity: number;
  chunkSize: number;
  broadcastInterval: number;
}

/** Default grid configuration (64x64) */
const DEFAULT_CONFIG: GridConfig = {
  width: 64,
  height: 64,
  maxCapacity: 100,
  chunkSize: 1,
  broadcastInterval: 100
};

/**
 * Main TrafficResonance class.
 * Extends TraitResonanceEngine for 64x64 chunk grid.
 */
export class TrafficResonance extends TraitResonanceEngine {
  private readonly config: GridConfig;
  private chunkDensity: Map<string, ChunkDensity> = new Map();
  private entityCount: Map<string, number> = new Map();
  private lastBroadcast: Map<string, number> = new Map();
  private broadcastCallback: ((data: TrafficHeatmapBroadcast) => void) | null = null;

  constructor(config: Partial<GridConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Register broadcast callback */
  public onBroadcast(callback: (data: TrafficHeatmapBroadcast) => void): void {
    this.broadcastCallback = callback;
  }

  /** Unregister broadcast callback */
  public offBroadcast(): void {
    this.broadcastCallback = null;
  }

  /** Get chunk key from world coordinates */
  public getChunkKey(x: number, y: number): string {
    const cx = Math.floor(x / this.config.chunkSize);
    const cy = Math.floor(y / this.config.chunkSize);
    return `${cx}:${cy}`;
  }

  /** Calculate density_avg deterministically */
  public calculateDensity(entityCount: number): number {
    return entityCount / this.config.maxCapacity;
  }

  /** Calculate flow intensity based on density */
  public calculateFlowIntensity(density: number): number {
    if (density < 0.3) return density * 2.0;
    else if (density < 0.7) return 0.6 + (density - 0.3) * 0.5;
    else return 1.0 - (density - 0.7) * 2.0;
  }

  /** Update all chunks with entity positions */
  public update(entities: TrafficEntity[]): void {
    this.entityCount.clear();

    // O(n) entity assignment
    for (const entity of entities) {
      const chunkKey = this.getChunkKey(entity.x, entity.y);
      if (!this.isValidChunk(chunkKey)) continue;
      const count = this.entityCount.get(chunkKey) || 0;
      this.entityCount.set(chunkKey, count + 1);
    }

    // Update density
    this.entityCount.forEach((count, chunkKey) => {
      this.updateChunkDensity(chunkKey, count);
    });

    this.broadcastAll();
  }

  private updateChunkDensity(chunkKey: string, entityCount: number): void {
    const density_avg = this.calculateDensity(entityCount);
    const flow_intensity = this.calculateFlowIntensity(density_avg);

    const density: ChunkDensity = {
      chunkKey,
      density_avg,
      entityCount,
      maxCapacity: this.config.maxCapacity,
      flow_intensity,
      timestamp: Date.now()
    };

    this.chunkDensity.set(chunkKey, density);
  }

  private isValidChunk(chunkKey: string): boolean {
    const [cx, cy] = chunkKey.split(':').map(Number);
    return cx >= 0 && cx < this.config.width && cy >= 0 && cy < this.config.height;
  }

  private broadcastAll(): void {
    if (!this.broadcastCallback) return;
    const now = Date.now();
    this.chunkDensity.forEach((density, chunkKey) => {
      const lastTime = this.lastBroadcast.get(chunkKey) || 0;
      if (now - lastTime >= this.config.broadcastInterval) {
        this.broadcastChunkResonance(chunkKey, density);
        this.lastBroadcast.set(chunkKey, now);
      }
    });
  }

  /** Broadcast chunk resonance to clients */
  public broadcastChunkResonance(chunkKey: string, data: ChunkDensity): void {
    if (!this.broadcastCallback) return;
    const broadcast: TrafficHeatmapBroadcast = {
      type: 'chunk_density',
      chunkKey,
      density_avg: data.density_avg,
      entityCount: data.entityCount,
      flow_intensity: data.flow_intensity,
      timestamp: data.timestamp
    };
    this.broadcastCallback(broadcast);
  }

  /** Get density for specific chunk */
  public getChunkDensity(chunkKey: string): ChunkDensity | undefined {
    return this.chunkDensity.get(chunkKey);
  }

  /** Get density matrix (64x64) */
  public getDensityMatrix(): Float32Array {
    const matrix = new Float32Array(this.config.width * this.config.height);
    for (let x = 0; x < this.config.width; x++) {
      for (let y = 0; y < this.config.height; y++) {
        const chunkKey = `${x}:${y}`;
        const density = this.chunkDensity.get(chunkKey);
        matrix[y * this.config.width + x] = density?.density_avg || 0;
      }
    }
    return matrix;
  }

  /** Get aggregate statistics */
  public getStatistics(): { totalEntities: number; averageDensity: number; maxDensity: number; overloadedChunks: number } {
    let totalEntities = 0, totalDensity = 0, maxDensity = 0, overloadedChunks = 0;
    this.chunkDensity.forEach((density) => {
      totalEntities += density.entityCount;
      totalDensity += density.density_avg;
      maxDensity = Math.max(maxDensity, density.density_avg);
      if (density.density_avg >= 1.0) overloadedChunks++;
    });
    const chunkCount = this.chunkDensity.size || 1;
    return { totalEntities, averageDensity: totalDensity / chunkCount, maxDensity, overloadedChunks };
  }

  /** Reset all data */
  public reset(): void {
    this.chunkDensity.clear();
    this.entityCount.clear();
    this.lastBroadcast.clear();
  }
}

export default TrafficResonance;
export { DEFAULT_CONFIG };
