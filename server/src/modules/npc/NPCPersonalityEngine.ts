import { SeededARERng, createARESeed } from '../../core/determinism/AREDeterminism.js';

export class NPCPersonalityEngine {
  /**
   * Generates deterministic traits for an NPC based on its ID.
   * Ensures WorldHash consistency by avoiding Math.random().
   */
  generateTraits(npcId: string) {
    const rng = new SeededARERng(createARESeed(['npc-traits', npcId]));
    return {
      courage: rng.nextFloat(),
      curiosity: rng.nextFloat(),
      greed: rng.nextFloat(),
      faith: rng.nextFloat(),
      aggression: rng.nextFloat()
    };
  }
}
