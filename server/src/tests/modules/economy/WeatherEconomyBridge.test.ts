import { describe, it, expect, beforeEach } from "vitest";
import { WeatherEconomyBridge } from "../../../modules/economy/WeatherEconomyBridge.js";
import { WeatherSystem } from "../../../modules/world/WeatherSystem.js";
import { EconomySystem } from "../../../modules/economy/EconomySystem.js";

describe("WeatherEconomyBridge", () => {
  let weatherSystem: WeatherSystem;
  let economySystem: EconomySystem;
  let bridge: WeatherEconomyBridge;

  beforeEach(() => {
    weatherSystem = new WeatherSystem();
    economySystem = new EconomySystem();
    bridge = new WeatherEconomyBridge(weatherSystem, economySystem);
  });

  it("should adjust prices deterministically for the same tick and weather", () => {
    // Tick 2 is "storm", which has a significant impact on health_potion
    const tick = 2;

    // First run
    bridge.updatePrices(tick);
    const price1 = economySystem.getPrice("health_potion");

    // Reset and second run
    economySystem.resetPrices();
    bridge.updatePrices(tick);
    const price2 = economySystem.getPrice("health_potion");

    expect(price1).toBe(price2);
    expect(price1).not.toBe(50); // Should be changed from default
  });

  it("should apply different multipliers for different weather states", () => {
    // Tick 0 is "clear"
    bridge.updatePrices(0);
    const clearPrice = economySystem.getPrice("health_potion");

    // Tick 2 is "storm"
    economySystem.resetPrices();
    bridge.updatePrices(2);
    const stormPrice = economySystem.getPrice("health_potion");

    expect(stormPrice).not.toBe(clearPrice);
    expect(stormPrice).toBeGreaterThan(clearPrice);
  });

  it("should be consistent across multiple calls with same tick", () => {
     bridge.updatePrices(100);
     const firstResult = economySystem.getPrice("health_potion");

     economySystem.resetPrices();
     bridge.updatePrices(100);
     const secondResult = economySystem.getPrice("health_potion");

     expect(firstResult).toBe(secondResult);
  });

  it("should handle unknown weather states gracefully (though unlikely)", () => {
    // Mocking weather system to return an unknown state
    const mockWeatherSystem = {
        nextWeather: () => "mystical_void"
    } as any;
    const testBridge = new WeatherEconomyBridge(mockWeatherSystem, economySystem);

    const initialPrice = economySystem.getPrice("health_potion");
    testBridge.updatePrices(1);
    const finalPrice = economySystem.getPrice("health_potion");

    expect(finalPrice).toBe(initialPrice);
  });
});
