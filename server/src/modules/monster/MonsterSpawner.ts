import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

export class MonsterSpawner {
  spawn(species: string, biome: string) {
    const dna = generateMonsterDNA(species);
    return mutateMonster(dna, biome);
  }
}