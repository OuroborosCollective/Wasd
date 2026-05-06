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
 * ResonanceGrid implements a 64x64 sector-based spatial influence field.
 * It uses a deterministic diffusion-decay model to simulate the spread of social and environmental energy.
 */
export class ResonanceGrid extends EventEmitter {
  private static readonly SIZE = 64;
  private static readonly CHANNEL_COUNT = 4; // Corresponding to ResonanceType
  private static readonly DIFFUSION_RATE = 0.15;
  private static readonly DECAY_RATE = 0.05;

  // Float32Array for high performance and low GC pressure
  private grid: Float32Array;
  private buffer: Float32Array;

  constructor() {
    super();
    const totalCells = ResonanceGrid.SIZE * ResonanceGrid.SIZE * ResonanceGrid.CHANNEL_COUNT;
    this.grid = new Float32Array(totalCells);
    this.buffer = new Float32Array(totalCells);
  }

  /**
   * Translates 2D coordinates and type into a 1D index.
   */
  private getIndex(x: number, y: number, type: ResonanceType): number {
    const clampedX = Math.max(0, Math.min(ResonanceGrid.SIZE - 1, Math.floor(x)));
    const clampedY = Math.max(0, Math.min(ResonanceGrid.SIZE - 1, Math.floor(y)));
    return (clampedY * ResonanceGrid.SIZE + clampedX) * ResonanceGrid.CHANNEL_COUNT + type;
  }

  /**
   * Injects resonance into a specific sector.
   * NPCs consume this data as non-persistent behavioral drivers.
   */
  public inject(x: number, y: number, type: ResonanceType, intensity: number): void {
    const idx = this.getIndex(x, y, type);
    this.grid[idx] = Math.min(100, this.grid[idx] + intensity);
  }

  /**
   * Retrieves the resonance value at a specific location.
   */
  public getResonance(x: number, y: number, type: ResonanceType): number {
    return this.grid[this.getIndex(x, y, type)];
  }

  /**
   * Performs a simulation step: Diffusion and Decay.
   * This is intended to be called at a fixed interval (e.g., every 500ms).
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

          // 4-neighbor diffusion (Von Neumann neighborhood)
          if (x > 0) { sum += this.grid[((y * SIZE) + (x - 1)) * CHANNELS + t]; count++; }
          if (x < SIZE - 1) { sum += this.grid[((y * SIZE) + (x + 1)) * CHANNELS + t]; count++; }
          if (y > 0) { sum += this.grid[(((y - 1) * SIZE) + x) * CHANNELS + t]; count++; }
          if (y < SIZE - 1) { sum += this.grid[(((y + 1) * SIZE) + x) * CHANNELS + t]; count++; }

          const average = sum / count;
          const currentVal = this.grid[currentIdx];
          
          // Apply Diffusion logic
          let nextVal = currentVal + (average - currentVal) * ResonanceGrid.DIFFUSION_RATE;
          
          // Apply Decay logic
          nextVal *= (1 - ResonanceGrid.DECAY_RATE);

          // Thresholding to prevent micro-values
          this.buffer[currentIdx] = nextVal < 0.01 ? 0 : nextVal;
        }
      }
    }

    // Swap buffers
    this.grid.set(this.buffer);
    this.emit('updated');
  }

  /**
   * Returns a snapshot for external visualization or debugging.
   */
  public getGridSnapshot(): Float32Array {
    return new Float32Array(this.grid);
  }

  /**
   * Helper for NPC logic to query surrounding "vibe" intensities.
   */
  public getLocalInference(x: number, y: number): Record<keyof typeof ResonanceType, number> {
    return {
      COMBAT: this.getResonance(x, y, ResonanceType.COMBAT),
      TRADE: this.getResonance(x, y, ResonanceType.TRADE),
      MAGIC: this.getResonance(x, y, ResonanceType.MAGIC),
      GENERAL: this.getResonance(x, y, ResonanceType.GENERAL)
    } as any;
  }
}

export default new ResonanceGrid();