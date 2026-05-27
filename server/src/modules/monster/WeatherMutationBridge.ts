import { type ARERng } from "../../core/determinism/AREDeterminism.js";
import { type MutatedMonster } from "./MonsterMutation.js";

/**
 * Deterministically applies weather-based mutations to a monster.
 * This bridge connects the WeatherSystem states to MonsterMutation logic.
 */
export function applyWeatherMutations(
  monster: MutatedMonster,
  weather: string,
  rng: ARERng
): MutatedMonster {
  const mutated = { ...monster, mutations: [...monster.mutations] };

  switch (weather) {
    case "clear":
      if (rng.nextFloat() < 0.1) {
        mutated.mutations.push("sun_blessed");
        mutated.intelligence += 0.05;
      }
      break;
    case "rain":
      mutated.speed += 0.05;
      mutated.mutations.push("aquatic_adaptation");
      break;
    case "storm":
      mutated.strength += 0.1;
      mutated.mutations.push("static_charge");
      if (rng.nextFloat() < 0.05) {
        mutated.mutations.push("lightning_touched");
      }
      break;
    case "fog":
      mutated.speed += 0.1;
      mutated.mutations.push("mist_stalker");
      break;
    case "snow":
      mutated.resilience += 0.15;
      mutated.mutations.push("arctic_fur");
      break;
    case "heatwave":
      mutated.aggression += 0.2;
      mutated.mutations.push("ember_skin");
      break;
  }

  return mutated;
}
