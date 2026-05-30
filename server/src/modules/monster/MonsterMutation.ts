import { type ARERng, SeededARERng, createARESeed } from "../../core/determinism/AREDeterminism.js";
import { type MonsterDNA } from "./MonsterDNA.js";
import { WeatherMonsterBridge } from "./WeatherMonsterBridge.js";

export interface MutatedMonster extends MonsterDNA {
  mutations: string[];
}

export function mutateMonster(
  dna: MonsterDNA,
  biome: string,
  rng: ARERng = new SeededARERng(createARESeed(["monster-mutation", dna.species, biome])),
  weather?: string
): MutatedMonster {
  let clone: MutatedMonster = { ...dna, mutations: [] as string[] };

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

  if (weather) {
    clone = WeatherMonsterBridge.applyWeatherModifiers(clone, weather);
  }

  return clone;
}
