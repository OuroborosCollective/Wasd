import { PlexityGate, FeatureSet } from './PlexityGate';

export class CelestialPlexity {
  private gate: PlexityGate;

  constructor() {
    this.gate = PlexityGate.getInstance();
  }

  public renderCelestialAura(isAligned: boolean): FeatureSet {
    const currentFeatures = { ...this.gate.getFeatures() };

    if (isAligned) {
      console.log('[Plexity Celestial] Celestial Alignment detected. Enhancing auras and starfield.');
      currentFeatures.shaders = 'celestial';
      currentFeatures.postProcessing = true;
      currentFeatures.particleBudget += 1000;
    }

    return currentFeatures;
  }
}
