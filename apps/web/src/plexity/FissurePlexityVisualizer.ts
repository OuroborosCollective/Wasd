import { PlexityGate, FeatureSet } from './PlexityGate';

export class FissurePlexityVisualizer {
  private gate: PlexityGate;

  constructor() {
    this.gate = PlexityGate.getInstance();
  }

  /**
   * Adapts the rendering strategy when entering a Reality Fissure (isolated broken chunk).
   * Applies "glitch" aesthetic while massively saving GPU power so the server can heal.
   */
  public adaptToFissure(inFissureZone: boolean, fissureSeverity: number): FeatureSet {
      const currentFeatures = { ...this.gate.getFeatures() };

      if (!inFissureZone || fissureSeverity < 0.5) {
          return currentFeatures; // Normal operation
      }

      console.warn(`[Plexity Fissure] Entering Reality Fissure (Severity: ${fissureSeverity.toFixed(2)}). Engaging Glitch Shaders and isolating load.`);

      // Activate glitch post-processing (assumes 'cinematic' or custom shader handles it)
      currentFeatures.shaders = 'basic'; // Strip normal shaders
      currentFeatures.postProcessing = true; // Keep on for the specific "glitch" overlay

      // Massive resource drops for the "frozen" zone
      currentFeatures.enableIK = false;
      currentFeatures.shadowRes = 0;
      currentFeatures.particleBudget = 0; // No particles in a frozen time fissure
      currentFeatures.lodDistanceModifier = 0.5;

      return currentFeatures;
  }
}