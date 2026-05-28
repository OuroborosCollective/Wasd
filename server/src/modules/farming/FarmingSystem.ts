export class FarmingSystem {
  plant(seedId: string, plotId: string, tick: number) {
    return { seedId, plotId, plantedAt: tick };
  }
}