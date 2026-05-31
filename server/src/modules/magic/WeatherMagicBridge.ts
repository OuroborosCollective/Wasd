/**
 * Deterministic bridge between Weather and Magic systems.
 * Provides potency multipliers based on environmental conditions.
 */
export class WeatherMagicBridge {
  /**
   * Calculates the potency multiplier for a given spell element and weather condition.
   * Adheres to Level-A simulation determinism.
   */
  static getPotencyMultiplier(element: string, weather: string): number {
    const w = weather.toLowerCase();
    const e = element.toLowerCase();

    // Fire Spells
    if (e === "fire") {
      if (w === "heatwave") return 1.5;
      if (w === "rain" || w === "storm") return 0.5;
    }

    // Water Spells
    if (e === "water") {
      if (w === "rain") return 1.5;
      if (w === "heatwave") return 0.5;
    }

    // Lightning Spells
    if (e === "lightning") {
      if (w === "storm") return 1.5;
    }

    // Frost Spells
    if (e === "frost") {
      if (w === "snow") return 1.5;
      if (w === "heatwave") return 0.5;
    }

    return 1.0;
  }
}
