// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
export class FamilyGenerationSystem {
  createChild(parents: string[], house: string) {
    return {
      id: `child:${house}:${Date.now()}`,
      parents,
      house,
      bornAt: Date.now()
    };
  }
}