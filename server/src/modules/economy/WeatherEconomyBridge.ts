/**
 * Deterministic bridge between Weather and Economy systems.
 * Provides price multipliers based on environmental conditions.
 */
export class WeatherEconomyBridge {
  /**
   * Calculates the price multiplier for a given item based on weather.
   * Adheres to Level-A simulation determinism.
   */
  static getPriceMultiplier(itemId: string, weather: string): number {
    const w = weather.toLowerCase();
    const item = itemId.toLowerCase();

    // Wood/Lumber is harder to transport in storms
    if (item === "wood" || item === "lumber") {
      if (w === "storm") return 1.5;
    }

    // Mushrooms thrive in rain
    if (item === "mushrooms" || item === "fungi") {
      if (w === "rain") return 0.8;
    }

    // Water is scarce in heatwaves
    if (item === "water" || item === "ice") {
      if (w === "heatwave") return 2.0;
    }

    // Fish are harder to catch in storms
    if (item === "fish") {
      if (w === "storm") return 1.8;
    }

    return 1.0;
  }
}
