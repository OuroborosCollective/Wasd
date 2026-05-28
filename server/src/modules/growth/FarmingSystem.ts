import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

export class FarmingSystem {
  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  plant(seedId: string, biome: string) {
    return {
      seedId,
      biome,
      plantedAt: this.clock.now(),
      growth: 0,
    };
  }

  tick(crop: any) {
    crop.growth += 1;
    return crop;
  }
}
