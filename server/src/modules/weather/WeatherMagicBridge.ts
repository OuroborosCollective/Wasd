import { KAPPA, type KappaInt } from "../../core/are/Kappa.js";

/**
 * WeatherMagicBridge
 * Provides deterministic magic potency multipliers based on environmental weather conditions.
 * Uses ARELORIA KAPPA fixed-point math for cross-environment consistency.
 */
export class WeatherMagicBridge {
  /**
   * Returns a deterministic multiplier for magic potency.
   * @param weather The current weather type (e.g., 'clear', 'rain', 'storm', 'snow', 'heatwave')
   * @param magicType The type of magic being cast (e.g., 'fire', 'water', 'lightning', 'wind', 'earth')
   * @returns A KappaInt representing the multiplier (1000 = 1.0x)
   */
  public static getMultiplier(weather: string, magicType: string): KappaInt {
    const w = weather.toLowerCase();
    const m = magicType.toLowerCase();

    // Fire Magic
    if (m === "fire") {
      if (w === "heatwave") return 1500; // 1.5x
      if (w === "rain" || w === "storm") return 500; // 0.5x
      if (w === "snow") return 700; // 0.7x
    }

    // Water Magic
    if (m === "water") {
      if (w === "rain") return 1300; // 1.3x
      if (w === "storm") return 1500; // 1.5x
      if (w === "heatwave") return 600; // 0.6x
    }

    // Lightning Magic
    if (m === "lightning") {
      if (w === "storm") return 2000; // 2.0x
      if (w === "rain") return 1200; // 1.2x
    }

    // Wind Magic
    if (m === "wind") {
      if (w === "storm") return 1400; // 1.4x
    }

    // Earth Magic
    if (m === "earth") {
      if (w === "clear") return 1100; // 1.1x
    }

    // Default: No multiplier
    return KAPPA;
  }
}
