import { type ARERng, SeededARERng, createARESeed } from "../../core/determinism/AREDeterminism.js";
import { type MonsterDNA } from "./MonsterDNA.js";
import { WeatherMonsterBridge } from "./WeatherMonsterBridge.js";
import { type WeatherState } from "../magic/WeatherMagicBridge.js";

export interface MutatedMonster extends MonsterDNA {
  mutations: string[];
}

export function mutateMonster(
  dna: MonsterDNA,
  biome: string,
  rng: ARERng = new SeededARERng(createARESeed(["monster-mutation", dna.species, biome])),
  weather: WeatherState = "clear"
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

  // Weather-driven stats and mutations
  const weatherStats = WeatherMonsterBridge.getStatsModifier(weather);
  clone.aggression *= weatherStats.aggression;
  clone.strength *= weatherStats.strength;
  clone.speed *= weatherStats.speed;
  clone.intelligence *= weatherStats.intelligence;
  clone.resilience *= weatherStats.resilience;

  const weatherMutations = WeatherMonsterBridge.getWeatherMutations(weather);
  clone.mutations.push(...weatherMutations);

  return clone;
}
