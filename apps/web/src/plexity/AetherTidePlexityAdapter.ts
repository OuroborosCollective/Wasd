import { PlexityGate, FeatureSet, DeviceProfile } from './PlexityGate';

export class AetherTidePlexityAdapter {
  private gate: PlexityGate;

  constructor() {
    this.gate = PlexityGate.getInstance();
  }

  /**
   * Adapts the visual features based on the current Aether saturation level.
   * High Aether means more magic particles but requires culling other effects.
   */
  public adaptToAetherSaturation(saturationLevel: number): FeatureSet {
      const currentFeatures = { ...this.gate.getFeatures() };
      const profile = this.gate.getProfile();

      if (saturationLevel > 0.7) {
          // Increase particles for Aether ambiance, but aggressively cut shadows
          currentFeatures.particleBudget = Math.floor(currentFeatures.particleBudget * 1.5);

          if (profile.tier !== 'Ultra') {
              currentFeatures.shadowRes = Math.max(0, currentFeatures.shadowRes / 2);
          }
      }

      if (saturationLevel > 0.9) {
          // At extreme saturation, we must ensure FPS doesn't drop due to particles
           if (profile.tier === 'Low') {
                currentFeatures.postProcessing = false;
           }
           currentFeatures.lodDistanceModifier = Math.max(0.3, currentFeatures.lodDistanceModifier * 0.7);
      }

      return currentFeatures;
  }
}
