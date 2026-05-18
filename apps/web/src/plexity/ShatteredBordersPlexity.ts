import { FeatureSet, DeviceProfile } from './PlexityGate.js';

export class ShatteredBordersPlexity {
  /**
   * Adapts visual rendering for Shattered Borders based on the Device Profile.
   * Stateless design: purely transforms rendering parameters based on instability intensity.
   */
  public applyBorderInstabilityVisuals(
    baseFeatures: FeatureSet,
    profile: DeviceProfile,
    instability: number
  ): FeatureSet {
    if (instability <= 0) return baseFeatures;

    const adjustedFeatures: FeatureSet = { ...baseFeatures };

    switch (profile.tier) {
      case 'Ultra':
      case 'Performance':
        // High-end: Spatial distortions, advanced refraction shaders on borders
        adjustedFeatures.shaders = 'cinematic';
        adjustedFeatures.lodDistanceModifier = baseFeatures.lodDistanceModifier * (1 - (0.2 * instability)); // slightly pull in LOD to afford distortions
        adjustedFeatures.postProcessing = true;
        break;

      case 'Standard':
        // Mid-tier: Standard shaders, maybe ground crack decals
        adjustedFeatures.shaders = 'standard';
        adjustedFeatures.shadowRes = Math.max(512, Math.floor(baseFeatures.shadowRes * 0.8)); // reduce shadow res slightly during chaos
        break;

      case 'Legacy':
        // Low-end: Simple visual cue, no expensive distortions
        adjustedFeatures.shaders = 'basic';
        adjustedFeatures.postProcessing = false;
        break;
    }

    return adjustedFeatures;
  }
}
