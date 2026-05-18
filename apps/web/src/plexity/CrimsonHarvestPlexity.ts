import { FeatureSet, DeviceProfile } from './PlexityGate.js';

export class CrimsonHarvestPlexity {
  /**
   * Adjusts the visual feature set during a Crimson Harvest based on the Device Profile.
   * Stateless design: the client receives an intensity value (0.0 to 1.0) and scales visuals.
   */
  public applyHarvestVisuals(
    baseFeatures: FeatureSet,
    profile: DeviceProfile,
    harvestIntensity: number
  ): FeatureSet {
    if (harvestIntensity <= 0) return baseFeatures;

    // Create a new set to avoid mutating the base reference
    const adjustedFeatures: FeatureSet = { ...baseFeatures };

    switch (profile.tier) {
      case 'Ultra':
      case 'Performance':
        // High end gets advanced shaders (e.g. volumetric red fog, intense bloom)
        adjustedFeatures.shaders = 'cinematic';
        adjustedFeatures.particleBudget = Math.floor(baseFeatures.particleBudget * (1 + (0.5 * harvestIntensity)));
        adjustedFeatures.postProcessing = true;
        break;

      case 'Standard':
        // Mid tier gets standard shaders with slight particle boost
        adjustedFeatures.shaders = 'standard';
        adjustedFeatures.particleBudget = Math.floor(baseFeatures.particleBudget * (1 + (0.2 * harvestIntensity)));
        break;

      case 'Legacy':
        // Low end just uses basic shaders with no particle budget increase (maybe a flat screen tint)
        adjustedFeatures.shaders = 'basic';
        adjustedFeatures.postProcessing = false;
        break;
    }

    return adjustedFeatures;
  }
}
