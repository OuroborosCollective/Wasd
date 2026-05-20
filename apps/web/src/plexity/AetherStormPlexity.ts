import { PlexityGate, FeatureSet } from './PlexityGate';

export class AetherStormPlexity {
  private gate: PlexityGate;

  constructor() {
    this.gate = PlexityGate.getInstance();
  }

  public renderStormEffects(isStorming: boolean): FeatureSet {
    const currentFeatures = { ...this.gate.getFeatures() };

    if (isStorming) {
      console.log('[Plexity Aether] Aetherial Storm active. Rendering heavy lightning and wind particles.');
      currentFeatures.shaders = 'storm';
      currentFeatures.postProcessing = true;
      currentFeatures.particleBudget += 5000;
      currentFeatures.shadowRes = 512; // Lower shadow res to compensate for particles
    }

    return currentFeatures;
  }
}
