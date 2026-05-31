/**
 * Bridge between Weather and Economy systems to provide deterministic price multipliers.
 * Level-A simulation deterministic.
 */
export class WeatherEconomyBridge {
  /**
   * Returns a price multiplier based on weather and item type.
   * @param weather The current weather state (e.g., 'clear', 'rain', 'storm', 'snow', 'heatwave')
   * @param itemType The type of item (e.g., 'wood', 'mushroom', 'water', 'food')
   */
  public getPriceMultiplier(weather: string, itemType: string): number {
    // Standardize inputs
    const w = weather.toLowerCase();
    const i = itemType.toLowerCase();

    // Deterministic multiplier logic
    if (w === "storm") {
      if (i === "wood" || i === "metal") return 1.5; // Harder to transport/mine
      if (i === "fish") return 1.8; // Dangerous to fish
    }

    if (w === "rain") {
      if (i === "mushroom" || i === "herbs") return 0.8; // Faster growth / more common
      if (i === "fire_essence") return 1.4; // Harder to maintain in rain
    }

    if (w === "snow") {
      if (i === "food" || i === "grain") return 1.3; // Supply chain disruption
      if (i === "ice_essence") return 0.7; // Abundant
    }

    if (w === "heatwave") {
      if (i === "water") return 2.0; // High demand, low supply
      if (i === "ice_essence") return 2.5; // Rare and high demand
      if (i === "fire_essence") return 0.6; // Naturally occurring/abundant
    }

    if (w === "fog") {
      if (i === "rare_herbs") return 1.2; // Harder to spot/collect
    }

    // Default multiplier is 1.0 (neutral)
    return 1.0;
  }
}
