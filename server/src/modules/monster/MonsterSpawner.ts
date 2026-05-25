import { type ARERng } from "../../core/determinism/AREDeterminism.js";
import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

export class MonsterSpawner {
  spawn(species: string, biome: string, rng?: ARERng) {
    const dna = generateMonsterDNA(species, rng);
    return mutateMonster(dna, biome, rng);
  }
}
