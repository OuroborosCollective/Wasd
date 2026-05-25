import { type ARERng, SeededARERng, createARESeed } from "../../core/determinism/AREDeterminism.js";
import { type MonsterDNA } from "./MonsterDNA.js";

export interface MutatedMonster extends MonsterDNA {
  mutations: string[];
}

/**
 * Applies biome-based and random mutations to a monster.
 *
 * JULES' CAUSALITY CHECK:
 * Enforces determinism by using ARERng for the 'rare_variant' mutation roll.
 * This prevents WorldHash drift during simulation ticks where monsters are spawned or mutated.
 */
export function mutateMonster(
  dna: MonsterDNA,
  biome: string,
  rng: ARERng = new SeededARERng(createARESeed(["monster-mutation", dna.species, biome]))
): MutatedMonster {
  const clone: MutatedMonster = { ...dna, mutations: [] as string[] };

  if (biome === "snow") {
    clone.resilience += 0.2;
    clone.mutations.push("frost_resistance");
  }

  if (biome === "swamp") {
    clone.aggression += 0.15;
    clone.mutations.push("swamp_hunger");
  }

  if (rng.nextFloat() < 0.08) {
    clone.mutations.push("rare_variant");
  }

  return clone;
}
