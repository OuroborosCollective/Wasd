export class ResonanceGridService {
  private readonly GRID_SIZE = 64;
  private readonly TOTAL_CELLS = 4096; // 64 * 64
  private grid: Float32Array;
  private buffer: Float32Array;

  private readonly DECAY_FACTOR = 0.95;
  private readonly DIFFUSION_RATE = 0.1;

  constructor() {
    this.grid = new Float32Array(this.TOTAL_CELLS);
    this.buffer = new Float32Array(this.TOTAL_CELLS);
  }

  /**
   * Injects resonance intensity at specific grid coordinates.
   * Coordinates are clamped to [0, 63].
   */
  public addResonance(x: number, y: number, intensity: number): void {
    const ix = Math.max(0, Math.min(this.GRID_SIZE - 1, Math.floor(x)));
    const iy = Math.max(0, Math.min(this.GRID_SIZE - 1, Math.floor(y)));
    const index = iy * this.GRID_SIZE + ix;
    this.grid[index] += intensity;
  }

  /**
   * Processes one simulation step: applies decay and diffuses values to neighbors.
   * Implementation uses double-buffering for determinism.
   */
  public processTick(): void {
    // Clear buffer for the next state
    this.buffer.fill(0);

    for (let y = 0; y < this.GRID_SIZE; y++) {
      for (let x = 0; x < this.GRID_SIZE; x++) {
        const idx = y * this.GRID_SIZE + x;
        const currentVal = this.grid[idx];

        if (currentVal < 0.0001) continue;

        // Apply decay
        const decayedVal = currentVal * this.DECAY_FACTOR;
        
        // Calculate diffusion amount (0.1 distributed to 4 neighbors)
        const distributedAmount = decayedVal * this.DIFFUSION_RATE;
        const remainingAmount = decayedVal - distributedAmount;
        const perNeighbor = distributedAmount / 4;

        // Add remaining to self in buffer
        this.buffer[idx] += remainingAmount;

        // Diffuse to 4-way neighbors (Von Neumann neighborhood)
        // North
        if (y > 0) this.buffer[(y - 1) * this.GRID_SIZE + x] += perNeighbor;
        // South
        if (y < this.GRID_SIZE - 1) this.buffer[(y + 1) * this.GRID_SIZE + x] += perNeighbor;
        // West
        if (x > 0) this.buffer[y * this.GRID_SIZE + (x - 1)] += perNeighbor;
        // East
        if (x < this.GRID_SIZE - 1) this.buffer[y * this.GRID_SIZE + (x + 1)] += perNeighbor;
      }
    }

    // Swap grid and buffer
    const temp = this.grid;
    this.grid = this.buffer;
    this.buffer = temp;
  }

  /**
   * Samples the resonance field at a specific point. O(1) complexity.
   */
  public getInfluence(x: number, y: number): number {
    const ix = Math.max(0, Math.min(this.GRID_SIZE - 1, Math.floor(x)));
    const iy = Math.max(0, Math.min(this.GRID_SIZE - 1, Math.floor(y)));
    return this.grid[iy * this.GRID_SIZE + ix];
  }

  /**
   * Returns the entire underlying grid for serialization or visualization.
   */
  public getGridState(): Float32Array {
    return this.grid;
  }

  /**
   * Resets the entire grid to zero.
   */
  public clear(): void {
    this.grid.fill(0);
    this.buffer.fill(0);
  }
}