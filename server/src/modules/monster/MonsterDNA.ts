import { type ARERng, SeededARERng, createARESeed } from "../../core/determinism/AREDeterminism.js";

export interface MonsterDNA {
  species: string;
  strength: number;
  speed: number;
  aggression: number;
  intelligence: number;
  resilience: number;
}

/**
 * Generates monster DNA deterministically.
 *
 * JULES' CAUSALITY CHECK:
 * Replaces Math.random() with ARERng to ensure that monster attributes (strength, speed, etc.)
 * are reproducible across Replays. The default seed is derived from the species name
 * to maintain consistent baseline DNA if no external RNG is provided.
 */
export function generateMonsterDNA(
  species: string,
  rng: ARERng = new SeededARERng(createARESeed(["monster-dna", species]))
): MonsterDNA {
  return {
    species,
    strength: rng.nextFloat(),
    speed: rng.nextFloat(),
    aggression: rng.nextFloat(),
    intelligence: rng.nextFloat(),
    resilience: rng.nextFloat()
  };
}
