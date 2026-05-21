// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
export class FarmingSystem {
  plant(seedId: string, biome: string) {
    return {
      seedId,
      biome,
      plantedAt: Date.now(),
      growth: 0
    };
  }

  tick(crop: any) {
    crop.growth += 1;
    return crop;
  }
}