import { type ARERng, SeededARERng, createARESeed } from "../../core/determinism/AREDeterminism.js";
import { generateMonsterDNA } from "./MonsterDNA.js";
import { mutateMonster } from "./MonsterMutation.js";

export type MonsterSpawnPosition = {
  x: number;
  y: number;
  z?: number;
};

export type MonsterSpawnContext = {
  kappaPos: MonsterSpawnPosition;
  tick: number;
  packIndex?: number;
  spawnerId?: string;
};

export function createMonsterSpawnSeed(species: string, biome: string, context: MonsterSpawnContext): string {
  return createARESeed([
    "monster-spawn",
    species,
    biome,
    context.kappaPos.x,
    context.kappaPos.y,
    context.kappaPos.z ?? 0,
    context.tick,
    context.packIndex ?? 0,
    context.spawnerId ?? "default",
  ]);
}

export class MonsterSpawner {
  spawn(species: string, biome: string, contextOrRng?: MonsterSpawnContext | ARERng) {
    const rng = isMonsterSpawnContext(contextOrRng)
      ? new SeededARERng(createMonsterSpawnSeed(species, biome, contextOrRng))
      : contextOrRng;
    const dna = generateMonsterDNA(species, rng);
    return mutateMonster(dna, biome, rng);
  }
}

function isMonsterSpawnContext(value: MonsterSpawnContext | ARERng | undefined): value is MonsterSpawnContext {
  return Boolean(value && "kappaPos" in value && "tick" in value);
}
