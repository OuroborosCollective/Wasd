import { FeatureSet } from './PlexityGate.js';

/**
 * Ecosystem Resonance Engine - Plexity Component
 *
 * Maps the server's global Resonance state to local graphical overrides.
 * Ensures that high-resonance "anomalies" are rendered appropriately
 * without causing performance degradation on lower-tier devices.
 * 
 * Uses Kappa (1000) fixed-point scaling for resonance values.
 */
export class ResonancePlexityMapper {
  /**
   * Modifies the target feature set based on the current Resonance state and Device Profile.
   *
   * @param baseFeatures The default feature set determined by PlexityGate
   * @param serverResonanceKappa The resonance value (0 - 1000) received from the Brain (Kappa Scale)
   * @param deviceTier The evaluated tier of the current device
   */
  public getResonanceAdjustedFeatures(
    baseFeatures: FeatureSet,
    serverResonanceKappa: number,
    deviceTier: 'Legacy' | 'Standard' | 'Performance' | 'Ultra'
  ): FeatureSet {

    // Deep clone base features to avoid mutating the original
    const adjustedFeatures: FeatureSet = { ...baseFeatures };

    // High resonance (Kappa > 700) means chaotic visuals (particles, shaders)
    if (serverResonanceKappa > 700) {
      switch (deviceTier) {
        case 'Ultra':
          // Ultra devices get the full chaos - particleBudget * 1500 / 1000 (Kappa equivalent)
          adjustedFeatures.particleBudget = Math.floor((baseFeatures.particleBudget * 1500) / 1000);
          adjustedFeatures.shaders = 'cinematic';
          adjustedFeatures.postProcessing = true;
          break;
        case 'Performance':
          // Performance gets some chaos - particleBudget * 1200 / 1000
          adjustedFeatures.particleBudget = Math.floor((baseFeatures.particleBudget * 1200) / 1000);
          adjustedFeatures.shaders = 'advanced';
          break;
        case 'Standard':
          // Standard maintains playable FPS by dropping complex shaders during resonance
          adjustedFeatures.particleBudget = baseFeatures.particleBudget; // No increase
          adjustedFeatures.shaders = 'standard';
          adjustedFeatures.postProcessing = false; // Turn off to save fill rate
          break;
        case 'Legacy':
          // Legacy aggressively drops quality - particleBudget * 500 / 1000
          adjustedFeatures.particleBudget = Math.floor((baseFeatures.particleBudget * 500) / 1000);
          adjustedFeatures.shaders = 'basic';
          adjustedFeatures.shadowRes = 512; // Force low-res shadows
          adjustedFeatures.postProcessing = false;
          // Closer LODs: lodDistanceModifier * 700 / 1000
          adjustedFeatures.lodDistanceModifier = Math.floor((baseFeatures.lodDistanceModifier * 700) / 1000);
          break;
      }
    } else if (serverResonanceKappa < 300) {
      // Low resonance = calm, orderly world. We can slightly boost LOD distances (Kappa 1100/1000)
      if (deviceTier === 'Performance' || deviceTier === 'Ultra') {
         adjustedFeatures.lodDistanceModifier = Math.floor((baseFeatures.lodDistanceModifier * 1100) / 1000);
      }
    }

    return adjustedFeatures;
  }
}