import { SeededARERng } from '../../core/determinism/AREDeterminism.js';

export class NPCPersonalityEngine {
  /**
   * Generates deterministic traits for an NPC based on a seed.
   * This replaces native randomness to ensure simulation causality (Level-A).
   */
  generateTraits(seed: string) {
    const rng = new SeededARERng(seed);
    return {
      courage: rng.nextFloat(),
      curiosity: rng.nextFloat(),
      greed: rng.nextFloat(),
      faith: rng.nextFloat(),
      aggression: rng.nextFloat()
    };
  }
}
