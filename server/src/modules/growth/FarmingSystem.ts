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