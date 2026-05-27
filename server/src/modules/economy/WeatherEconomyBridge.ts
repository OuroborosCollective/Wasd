import { createARESeed, SeededARERng } from "../../core/determinism/AREDeterminism.js";
import type { WeatherSystem } from "../world/WeatherSystem.js";
import type { EconomySystem } from "./EconomySystem.js";

/**
 * Deterministically bridges weather states to economy price fluctuations.
 * This ensures that environmental conditions have a reproducible impact on market prices.
 */
export class WeatherEconomyBridge {
  constructor(
    private weatherSystem: WeatherSystem,
    private economySystem: EconomySystem
  ) {}

  /**
   * Updates economy prices based on the current weather state for a given tick.
   * @param tick The current simulation tick used for deterministic seed generation.
   */
  updatePrices(tick: number) {
    const weather = this.weatherSystem.nextWeather(tick);
    const rng = new SeededARERng(createARESeed(["weather-economy-bridge", tick, weather]));

    // Base price impacts for different items based on weather conditions.
    const impacts: Record<string, { itemId: string; baseMultiplier: number }[]> = {
      clear: [
        { itemId: "health_potion", baseMultiplier: 1.0 },
        { itemId: "iron_sword", baseMultiplier: 1.0 },
      ],
      rain: [
        { itemId: "health_potion", baseMultiplier: 1.1 },
      ],
      storm: [
        { itemId: "health_potion", baseMultiplier: 1.5 },
        { itemId: "iron_sword", baseMultiplier: 1.2 },
      ],
      heatwave: [
        { itemId: "health_potion", baseMultiplier: 1.3 },
      ],
      snow: [
        { itemId: "iron_sword", baseMultiplier: 1.1 },
      ],
      fog: [
        { itemId: "health_potion", baseMultiplier: 1.05 },
      ]
    };

    const currentImpacts = impacts[weather] || [];

    for (const impact of currentImpacts) {
      // Apply deterministic volatility (±10%) to the base multiplier.
      const volatility = 0.9 + (rng.nextFloat() * 0.2);
      const finalMultiplier = impact.baseMultiplier * volatility;

      this.economySystem.adjustPrice(impact.itemId, finalMultiplier);
    }
  }
}
