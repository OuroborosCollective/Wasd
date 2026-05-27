export class FarmingSystem {
  plant(seedId: string, biome: string, tick: number = 0) {
    return {
      seedId,
      biome,
      plantedAt: tick,
      growth: 0
    };
  }

  tick(crop: any) {
    crop.growth += 1;
    return crop;
  }
}
