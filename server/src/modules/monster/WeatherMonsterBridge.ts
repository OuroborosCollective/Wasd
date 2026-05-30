import { type MutatedMonster } from "./MonsterMutation.js";

/**
 * Bridge between Weather and Monster modules.
 * Provides deterministic modifiers for monster stats based on current weather.
 */
export class WeatherMonsterBridge {
  /**
   * Applies deterministic stat modifiers to a monster based on the weather.
   * @param monster The monster to modify.
   * @param weather The current weather state.
   */
  public static applyWeatherModifiers(monster: MutatedMonster, weather: string): MutatedMonster {
    switch (weather) {
      case "storm":
        monster.aggression += 0.2;
        monster.strength += 0.1;
        monster.mutations.push("storm_frenzy");
        break;
      case "fog":
        monster.speed += 0.15;
        monster.intelligence += 0.1;
        monster.mutations.push("mist_stalker");
        break;
      case "heatwave":
        monster.resilience -= 0.1;
        monster.aggression += 0.1;
        monster.mutations.push("heat_exhaustion");
        break;
      case "rain":
        monster.speed -= 0.05;
        monster.resilience += 0.05;
        break;
      case "snow":
        monster.speed -= 0.1;
        monster.resilience += 0.15;
        monster.mutations.push("frost_touched");
        break;
    }
    return monster;
  }
}
