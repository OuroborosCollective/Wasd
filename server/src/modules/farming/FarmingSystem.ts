export class FarmingSystem {
  plant(seedId: string, plotId: string, tick: number = 0) {
    return { seedId, plotId, plantedAt: tick };
  }
}
