// @ARE-GUARD-EXEMPT: Planting timestamps; not world-state input.
export class FarmingSystem {
  plant(seedId: string, plotId: string) {
    return { seedId, plotId, plantedAt: Date.now() };
  }
}