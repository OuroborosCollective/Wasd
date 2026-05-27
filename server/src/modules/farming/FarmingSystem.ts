import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

/**
 * FarmingSystem manages the planting and lifecycle of crops.
 *
 * CAUSALITY: This system uses an injected AREClock to ensure that 'plantedAt'
 * timestamps are derived from simulation ticks rather than the host's wall-clock.
 * This guarantees that the WorldHash remains consistent across replays.
 */
export class FarmingSystem {
  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  plant(seedId: string, plotId: string) {
    return {
      seedId,
      plotId,
      plantedAt: this.clock.now()
    };
  }
}
