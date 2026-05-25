import { type ARERng, SeededARERng, createARESeed } from "../../core/determinism/AREDeterminism.js";

export interface MonsterDNA {
  species: string;
  strength: number;
  speed: number;
  aggression: number;
  intelligence: number;
  resilience: number;
}

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
