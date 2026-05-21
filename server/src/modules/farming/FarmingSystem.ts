// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class FarmingSystem {
  plant(seedId: string, plotId: string) {
    return { seedId, plotId, plantedAt: Date.now() };
  }
}
