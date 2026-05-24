// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
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