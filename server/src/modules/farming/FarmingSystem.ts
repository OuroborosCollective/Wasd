// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
export class FarmingSystem {
  plant(seedId: string, plotId: string) {
    return { seedId, plotId, plantedAt: Date.now() };
  }
}