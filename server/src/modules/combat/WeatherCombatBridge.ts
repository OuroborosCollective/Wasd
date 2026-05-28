export interface WeatherModifiers {
  hitChance: number;
  damage: number;
}

export class WeatherCombatBridge {
  public static getModifiers(weather?: string): WeatherModifiers {
    if (!weather) {
      return { hitChance: 1.0, damage: 1.0 };
    }

    switch (weather) {
      case "rain":
        return { hitChance: 0.9, damage: 1.0 };
      case "storm":
        return { hitChance: 0.8, damage: 1.1 };
      case "fog":
        return { hitChance: 0.7, damage: 1.0 };
      case "snow":
        return { hitChance: 0.85, damage: 0.9 };
      case "heatwave":
        return { hitChance: 0.95, damage: 1.15 };
      case "clear":
      default:
        return { hitChance: 1.0, damage: 1.0 };
    }
  }
}
