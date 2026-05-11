import { EventEmitter } from 'events';

/**
 * ResonanceType defines the nature of the energy within the grid.
 */
export enum ResonanceType {
  COMBAT = 0,
  TRADE = 1,
  MAGIC = 2,
  GENERAL = 3
}

/**
 * Holographic Delta represents a sparse update of the grid state.
 */
export interface ResonanceDelta {
  timestamp: number;
  indices: Uint32Array;
  values: Float32Array;
}

/**
 * ResonanceGrid implements a 64x64 sector-based spatial influence field.
 * Utilizing holographic state-diffing and a fixed-point coordinate system
 * for synchronized state mirrors across the Areloria monorepo.
 */
export class ResonanceGrid extends EventEmitter {
  private static readonly SIZE = 64;
  private static readonly CHANNEL_COUNT = 4;
  private static readonly DIFFUSION_RATE = 0.15;
  private static readonly DECAY_RATE = 0.05;
  private static readonly EPSILON = 0.005; // Threshold for diffing and micro-values
  
  // Fixed-point scaling factor (e.g., 1000 units = 1.0 world unit)
  private static readonly FP_SCALE = 1000;
  // World space to grid space scale (Assumes world is larger than grid)
  private static readonly WORLD_TO_GRID_RATIO = 16; 

  private grid: Float32Array;
  private buffer: Float32Array;
  private lastSyncedGrid: Float32Array;

  constructor() {
    super();
    const totalCells = ResonanceGrid.SIZE * ResonanceGrid.SIZE * ResonanceGrid.CHANNEL_COUNT;
    this.grid = new Float32Array(totalCells);
    this.buffer = new Float32Array(totalCells);
    this.lastSyncedGrid = new Float32Array(totalCells);
  }

  /**
   * Translates fixed-point coordinates and type into a 1D index.
   * @param fpX Fixed-point X coordinate
   * @param fpY Fixed-point Y coordinate
   */
  private getIndex(fpX: number, fpY: number, type: ResonanceType): number {
    // Convert fixed-point to grid units
    const worldX = fpX / ResonanceGrid.FP_SCALE;
    const worldY = fpY / ResonanceGrid.FP_SCALE;
    
    const gridX = Math.floor(worldX / ResonanceGrid.WORLD_TO_GRID_RATIO);
    const gridY = Math.floor(worldY / ResonanceGrid.WORLD_TO_GRID_RATIO);

    const clampedX = Math.max(0, Math.min(ResonanceGrid.SIZE - 1, gridX));
    const clampedY = Math.max(0, Math.min(ResonanceGrid.SIZE - 1, gridY));
    
    return (clampedY * ResonanceGrid.SIZE + clampedX) * ResonanceGrid.CHANNEL_COUNT + type;
  }

  /**
   * Injects resonance into a specific sector using fixed-point coordinates.
   */
  public inject(fpX: number, fpY: number, type: ResonanceType, intensity: number): void {
    const idx = this.getIndex(fpX, fpY, type);
    this.grid[idx] = Math.min(100, this.grid[idx] + intensity);
  }

  /**
   * Retrieves the resonance value at a specific fixed-point location.
   */
  public getResonance(fpX: number, fpY: number, type: ResonanceType): number {
    return this.grid[this.getIndex(fpX, fpY, type)];
  }

  /**
   * Performs a simulation step: Diffusion and Decay.
   * Implements holographic state-diffing by identifying changed cells.
   */
  public update(): void {
    const SIZE = ResonanceGrid.SIZE;
    const CHANNELS = ResonanceGrid.CHANNEL_COUNT;

    for (let t = 0; t < CHANNELS; t++) {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const currentIdx = (y * SIZE + x) * CHANNELS + t;
          let sum = 0;
          let count = 0;

          // 4-neighbor diffusion
          if (x > 0) { sum += this.grid[((y * SIZE) + (x - 1)) * CHANNELS + t]; count++; }
          if (x < SIZE - 1) { sum += this.grid[((y * SIZE) + (x + 1)) * CHANNELS + t]; count++; }
          if (y > 0) { sum += this.grid[(((y - 1) * SIZE) + x) * CHANNELS + t]; count++; }
          if (y < SIZE - 1) { sum += this.grid[(((y + 1) * SIZE) + x) * CHANNELS + t]; count++; }

          const average = sum / count;
          const currentVal = this.grid[currentIdx];
          
          let nextVal = currentVal + (average - currentVal) * ResonanceGrid.DIFFUSION_RATE;
          nextVal *= (1 - ResonanceGrid.DECAY_RATE);

          this.buffer[currentIdx] = nextVal < ResonanceGrid.EPSILON ? 0 : nextVal;
        }
      }
    }

    // Swap buffers
    this.grid.set(this.buffer);
    
    // Check for significant changes to emit holographic delta
    const delta = this.createHolographicDelta();
    if (delta.indices.length > 0) {
      this.emit('updated', delta);
    }
  }

  /**
   * Creates a sparse delta of the state changes since the last holographic sync.
   */
  private createHolographicDelta(): ResonanceDelta {
    const indices: number[] = [];
    const values: number[] = [];

    for (let i = 0; i < this.grid.length; i++) {
      if (Math.abs(this.grid[i] - this.lastSyncedGrid[i]) > ResonanceGrid.EPSILON) {
        indices.push(i);
        values.push(this.grid[i]);
        this.lastSyncedGrid[i] = this.grid[i];
      }
    }

    return {
      timestamp: Date.now(),
      indices: new Uint32Array(indices),
      values: new Float32Array(values)
    };
  }

  /**
   * Applies a holographic delta to the current grid state (Mirror synchronization).
   */
  public applyDelta(delta: ResonanceDelta): void {
    for (let i = 0; i < delta.indices.length; i++) {
      const idx = delta.indices[i];
      const val = delta.values[i];
      this.grid[idx] = val;
      this.lastSyncedGrid[idx] = val;
    }
  }

  /**
   * Returns a full snapshot for initial state synchronization.
   */
  public getGridSnapshot(): Float32Array {
    return new Float32Array(this.grid);
  }

  /**
   * Helper for NPC logic to query surrounding "vibe" intensities using fixed-point coords.
   */
  public getLocalInference(fpX: number, fpY: number): Record<keyof typeof ResonanceType, number> {
    return {
      COMBAT: this.getResonance(fpX, fpY, ResonanceType.COMBAT),
      TRADE: this.getResonance(fpX, fpY, ResonanceType.TRADE),
      MAGIC: this.getResonance(fpX, fpY, ResonanceType.MAGIC),
      GENERAL: this.getResonance(fpX, fpY, ResonanceType.GENERAL)
    };
  }
}

export default new ResonanceGrid();