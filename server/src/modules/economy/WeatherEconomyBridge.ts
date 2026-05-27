import { createARESeed, SeededARERng } from "../../core/determinism/AREDeterminism.js";
import { WeatherSystem } from "../world/WeatherSystem.js";
import { EconomySystem } from "./EconomySystem.js";

/**
 * Deterministic bridge between Weather and Economy systems.
 * Adjusts prices based on weather patterns to simulate atmospheric supply/demand.
 */
export class WeatherEconomyBridge {
  constructor(
    private weatherSystem: WeatherSystem,
    private economySystem: EconomySystem
  ) {}

  /**
   * Updates economy prices based on the current weather state and a deterministic seed.
   * @param tick The current world tick for seed derivation.
   */
  public syncPrices(tick: number): void {
    const weather = this.weatherSystem.nextWeather(tick);
    const rng = new SeededARERng(createARESeed(["weather-economy-bridge", tick, weather]));

    // Reset to baseline before applying weather effects
    this.economySystem.resetPrices();

    switch (weather) {
      case "storm":
      case "rain":
        // High demand for warm/protective items
        this.economySystem.adjustPrice("wolf_pelt", 1.2 + rng.nextFloat() * 0.3);
        break;
      case "heatwave":
        // High demand for refreshing draughts
        this.economySystem.adjustPrice("minor_mana_draught", 1.5 + rng.nextFloat() * 0.5);
        break;
      case "snow":
        // Extreme demand for pelts and mana for heating spells
        this.economySystem.adjustPrice("wolf_pelt", 2.0 + rng.nextFloat() * 1.0);
        this.economySystem.adjustPrice("minor_mana_draught", 1.3 + rng.nextFloat() * 0.2);
        break;
      case "fog":
        // Uncertainty increases prices of basic tools
        this.economySystem.adjustPrice("starter_sword", 1.1 + rng.nextFloat() * 0.2);
        break;
      default:
        // Clear weather keeps prices stable
        break;
    }
  }
}
