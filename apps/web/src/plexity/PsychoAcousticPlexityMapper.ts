import { PlexityGate, FeatureSet } from './PlexityGate';

export class PsychoAcousticPlexityMapper {
  private gate: PlexityGate;

  constructor() {
    this.gate = PlexityGate.getInstance();
  }

  /**
   * Modifies visual aesthetics (desaturation/blur) and audio channel limits based on morale.
   */
  public mapResonanceToFeatures(resonanceLevel: number): FeatureSet {
      const currentFeatures = { ...this.gate.getFeatures() };

      // If fear/resonance is high, we limit chaotic rendering to focus the player
      // and enhance the atmosphere while saving performance.
      if (resonanceLevel > 0.5) {
          // Desaturate colors or add blur (simulated via postProcessing if available)
          if (currentFeatures.postProcessing) {
             console.log(`[Plexity] Elevated resonance (${resonanceLevel.toFixed(2)}). Engaging atmospheric desaturation filters.`);
             // Conceptual logic: in a real implementation we'd toggle a specific shader flag here
          }
      }

      if (resonanceLevel > 0.8) {
          console.warn(`[Plexity] CRITICAL fear cascade. Clamping audio and visual chaos.`);
          // Drop shadows to make the environment starker and save performance
          currentFeatures.shadowRes = Math.min(1024, currentFeatures.shadowRes / 2);

          // Optionally reduce particles to give a sense of "dead air"
          currentFeatures.particleBudget = Math.floor(currentFeatures.particleBudget * 0.4);
      }

      return currentFeatures;
  }
}
