import { PlexityGate, FeatureSet } from './PlexityGate';

export class PrecognitionPlexityAdapter {
  private gate: PlexityGate;

  constructor() {
    this.gate = PlexityGate.getInstance();
  }

  /**
   * Called when a proactive load signal is received from Watchdog.
   * Modifies the feature set dynamically *before* lag spikes happen.
   */
  public adaptToPrecognitiveLoad(projectedLoad: number, densityRisk: number): FeatureSet {
      const currentFeatures = { ...this.gate.getFeatures() };
      const profile = this.gate.getProfile();

      // If load is projected to be high, and we aren't a high-end device, aggressively strip features early.
      if (projectedLoad > 0.7) {
          console.warn(`[Plexity Pre-cognition] High load projected (${projectedLoad.toFixed(2)}). Engaging early downgrade.`);

          if (profile.tier !== 'Ultra') {
              currentFeatures.shadowRes = 0; // Pre-emptive shadow drop
              currentFeatures.postProcessing = false;
          }

          currentFeatures.particleBudget = Math.max(50, Math.floor(currentFeatures.particleBudget * 0.5));
          currentFeatures.lodDistanceModifier = Math.max(0.2, currentFeatures.lodDistanceModifier * 0.5);
      }

      if (densityRisk > 0.6) {
           console.warn(`[Plexity Pre-cognition] Density spike risk high (${densityRisk.toFixed(2)}). Engaging imposter aggressive culling.`);
           currentFeatures.enableIK = false; // Disable inverse kinematics to save CPU for density
           currentFeatures.lodDistanceModifier = Math.max(0.1, currentFeatures.lodDistanceModifier * 0.3);
      }

      return currentFeatures;
  }
}
