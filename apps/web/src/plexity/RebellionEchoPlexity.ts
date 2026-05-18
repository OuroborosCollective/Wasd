import { FeatureSet, DeviceProfile } from './PlexityGate.js';

export class RebellionEchoPlexity {
  /**
   * Modifies visual features to render the Rebellion Echo event based on the Device Profile.
   * Stateless design: scales visual indicators of social unrest.
   */
  public applyRebellionVisuals(
    baseFeatures: FeatureSet,
    profile: DeviceProfile,
    intensity: number
  ): FeatureSet {
    if (intensity <= 0) return baseFeatures;

    const adjustedFeatures: FeatureSet = { ...baseFeatures };

    switch (profile.tier) {
      case 'Ultra':
      case 'Performance':
        // Render detailed faction halos, dynamic flags, and heavy smoke particles from unrest
        adjustedFeatures.shaders = 'advanced';
        adjustedFeatures.particleBudget = Math.floor(baseFeatures.particleBudget * (1 + (0.4 * intensity)));
        adjustedFeatures.postProcessing = true;
        break;

      case 'Standard':
        // Moderate particles, basic halos
        adjustedFeatures.shaders = 'standard';
        adjustedFeatures.particleBudget = Math.floor(baseFeatures.particleBudget * (1 + (0.15 * intensity)));
        break;

      case 'Legacy':
        // Simple distinct color tinting on rebel characters, no particle boosts
        adjustedFeatures.shaders = 'basic';
        adjustedFeatures.postProcessing = false;
        break;
    }

    return adjustedFeatures;
  }
}
