import { PlexityGate, FeatureSet } from './PlexityGate';

export class PrecognitionPlexityAdapter {
  private gate: PlexityGate;

  constructor() {
    this.gate = PlexityGate.getInstance();
  }

  public adaptToPrecognitiveLoad(projectedLoad: number, densityRisk: number): FeatureSet {
      const currentFeatures = { ...this.gate.getFeatures() };
      const profile = this.gate.getProfile();

      if (projectedLoad > 0.7) {
          if (profile.tier !== 'Ultra') {
              currentFeatures.shadowRes = 0;
              currentFeatures.postProcessing = false;
          }
          currentFeatures.particleBudget = Math.max(50, Math.floor(currentFeatures.particleBudget * 0.5));
          currentFeatures.lodDistanceModifier = Math.max(0.2, currentFeatures.lodDistanceModifier * 0.5);
      }

      if (densityRisk > 0.6) {
           currentFeatures.enableIK = false;
           currentFeatures.lodDistanceModifier = Math.max(0.1, currentFeatures.lodDistanceModifier * 0.3);
      }

      return currentFeatures;
  }
}
