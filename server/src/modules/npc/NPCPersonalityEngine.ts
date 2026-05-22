import { type ARERng } from "../../core/determinism/AREDeterminism.js";

export class NPCPersonalityEngine {
  /**
   * Generates deterministic NPC traits using the provided ARE RNG.
   * Ensures absolute causality in NPC behavior derivation.
   */
  generateTraits(rng: ARERng) {
    return {
      courage: rng.nextFloat(),
      curiosity: rng.nextFloat(),
      greed: rng.nextFloat(),
      faith: rng.nextFloat(),
      aggression: rng.nextFloat()
    };
  }
}
