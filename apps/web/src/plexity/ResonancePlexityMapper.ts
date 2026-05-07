import { PlexityGate, DeviceProfile, FeatureSet } from './PlexityGate.js';

/**
 * Ecosystem Resonance Engine - Plexity Component
 *
 * Maps the server's global Resonance state to local graphical overrides.
 * Ensures that high-resonance "anomalies" are rendered appropriately
 * without causing performance degradation on lower-tier devices.
 */
export class ResonancePlexityMapper {
  private gate: PlexityGate;

  constructor() {
    this.gate = PlexityGate.getInstance();
  }

  /**
   * Modifies the target feature set based on the current Resonance state and Device Profile.
   *
   * @param baseFeatures The default feature set determined by PlexityGate
   * @param serverResonance The resonance value (0.0 - 1.0) received from the Brain
   * @param deviceTier The evaluated tier of the current device
   */
  public getResonanceAdjustedFeatures(
    baseFeatures: FeatureSet,
    serverResonance: number,
    deviceTier: 'Legacy' | 'Standard' | 'Performance' | 'Ultra'
  ): FeatureSet {

    // Deep clone base features to avoid mutating the original
    const adjustedFeatures: FeatureSet = { ...baseFeatures };

    // High resonance means chaotic visuals (particles, shaders)
    if (serverResonance > 0.7) {
      switch (deviceTier) {
        case 'Ultra':
          // Ultra devices get the full chaos
          adjustedFeatures.particleBudget = Math.floor(baseFeatures.particleBudget * 1.5);
          adjustedFeatures.shaders = 'cinematic';
          adjustedFeatures.postProcessing = true;
          break;
        case 'Performance':
          // Performance gets some chaos, but restrained
          adjustedFeatures.particleBudget = Math.floor(baseFeatures.particleBudget * 1.2);
          adjustedFeatures.shaders = 'advanced';
          break;
        case 'Standard':
          // Standard maintains playable FPS by dropping complex shaders during resonance
          adjustedFeatures.particleBudget = baseFeatures.particleBudget; // No increase
          adjustedFeatures.shaders = 'standard';
          adjustedFeatures.postProcessing = false; // Turn off to save fill rate
          break;
        case 'Legacy':
          // Legacy aggressively drops quality to survive resonance spikes
          adjustedFeatures.particleBudget = Math.floor(baseFeatures.particleBudget * 0.5);
          adjustedFeatures.shaders = 'basic';
          adjustedFeatures.shadowRes = 512; // Force low-res shadows
          adjustedFeatures.postProcessing = false;
          adjustedFeatures.lodDistanceModifier = baseFeatures.lodDistanceModifier * 0.7; // Closer LODs
          break;
      }
    } else if (serverResonance < 0.3) {
      // Low resonance = calm, orderly world. We can slightly boost LOD distances
      // if performance allows, as things are less chaotic.
      if (deviceTier === 'Performance' || deviceTier === 'Ultra') {
         adjustedFeatures.lodDistanceModifier = baseFeatures.lodDistanceModifier * 1.1;
      }
    }

    return adjustedFeatures;
  }
}
