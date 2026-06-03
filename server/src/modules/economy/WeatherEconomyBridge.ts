import { KAPPA, type KappaInt } from "../../core/are/Kappa.js";

/**
 * WeatherEconomyBridge
 * Provides deterministic price multipliers for items based on environmental weather conditions.
 * Enforces ARELORIA KAPPA fixed-point arithmetic for deterministic economic simulation.
 */
export class WeatherEconomyBridge {
  /**
   * Returns a deterministic price multiplier for an item category under specific weather.
   * @param weather The current weather type
   * @param itemCategory The category of the item (e.g., 'water', 'wood', 'wool', 'ice', 'herb')
   * @returns A KappaInt representing the price multiplier (1000 = 1.0x)
   */
  public static getPriceMultiplier(weather: string, itemCategory: string): KappaInt {
    const w = weather.toLowerCase();
    const c = itemCategory.toLowerCase();

    // Water & Hydration
    if (c === "water" || c === "ice") {
      if (w === "heatwave") return 2000; // 2.0x (Scarcity)
      if (w === "rain" || w === "storm") return 800; // 0.8x (Abundance)
    }

    // Wood & Fuel
    if (c === "wood" || c === "timber") {
      if (w === "storm" || w === "rain" || w === "snow") return 1500; // 1.5x (Difficulty of collection/drying)
    }

    // Clothing & Warmth
    if (c === "wool" || c === "fur" || c === "leather") {
      if (w === "snow" || w === "cold") return 1400; // 1.4x (High demand)
      if (w === "heatwave") return 700; // 0.7x (Low demand)
    }

    // Herbs & Agriculture
    if (c === "herb" || c === "mushroom") {
      if (w === "rain") return 800; // 0.8x (Fast growth/abundance)
      if (w === "heatwave") return 1600; // 1.6x (Drought/scarcity)
    }

    // Default: No multiplier
    return KAPPA;
  }
}
