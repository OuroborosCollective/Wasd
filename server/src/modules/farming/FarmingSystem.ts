import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

export class FarmingSystem {
  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  plant(seedId: string, plotId: string) {
    return { seedId, plotId, plantedAt: this.clock.now() };
  }
}