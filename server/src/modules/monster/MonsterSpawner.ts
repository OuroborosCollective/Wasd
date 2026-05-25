import { type ARERng } from "../../core/determinism/AREDeterminism.js";
import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

/**
 * MonsterSpawner orchestrates the creation of monsters.
 *
 * JULES' CAUSALITY CHECK:
 * Supports optional RNG injection to allow the World Engine to drive spawning
 * from the main simulation seed/tick, ensuring perfectly reproducible encounters.
 */
export class MonsterSpawner {
  spawn(species: string, biome: string, rng?: ARERng) {
    const dna = generateMonsterDNA(species, rng);
    return mutateMonster(dna, biome, rng);
  }
}
