import { PlexityGate, FeatureSet } from './PlexityGate';

export class VoidPlexity {
  private gate: PlexityGate;

  constructor() {
    this.gate = PlexityGate.getInstance();
  }

  public renderVoidDistortion(isResonating: boolean): FeatureSet {
    const currentFeatures = { ...this.gate.getFeatures() };

    if (isResonating) {
      console.warn('[Plexity Void] Void Resonance detected. Activating screen distortions.');
      currentFeatures.shaders = 'void_distortion';
      currentFeatures.postProcessing = true;
      currentFeatures.particleBudget += 2000;
      currentFeatures.lodDistanceModifier = 0.8;
    }

    return currentFeatures;
  }
}
