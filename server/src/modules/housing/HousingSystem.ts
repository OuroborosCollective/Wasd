// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class HousingSystem {
  createHouse(ownerId: string, plotId: string) {
    return {
      ownerId,
      plotId,
      createdAt: Date.now(),
      upgrades: 0
    };
  }
}
