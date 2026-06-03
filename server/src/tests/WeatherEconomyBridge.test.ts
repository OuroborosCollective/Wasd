import { describe, it, expect } from "vitest";
import { WeatherEconomyBridge } from "../modules/economy/WeatherEconomyBridge.js";
import { EconomySystem } from "../modules/economy/EconomySystem.js";
import { KAPPA } from "../core/are/Kappa.js";

describe("WeatherEconomyBridge", () => {
  it("returns 2000 (2.0x) for Water during Heatwave", () => {
    expect(WeatherEconomyBridge.getPriceMultiplier("heatwave", "water")).toBe(2000);
  });

  it("returns 800 (0.8x) for Water during Rain", () => {
    expect(WeatherEconomyBridge.getPriceMultiplier("rain", "water")).toBe(800);
  });

  it("returns 1500 (1.5x) for Wood during Storm", () => {
    expect(WeatherEconomyBridge.getPriceMultiplier("storm", "wood")).toBe(1500);
  });

  it("returns 1400 (1.4x) for Wool during Snow", () => {
    expect(WeatherEconomyBridge.getPriceMultiplier("snow", "wool")).toBe(1400);
  });
});

describe("EconomySystem Integration with Weather", () => {
  it("calculates weather-adjusted prices correctly", () => {
    const economy = new EconomySystem();
    economy.setPrice("bottled_water", 100);

    const heatwavePrice = economy.getWeatherAdjustedPrice("bottled_water", "water", "heatwave");
    expect(heatwavePrice).toBe(200); // 100 * 2.0

    const rainyPrice = economy.getWeatherAdjustedPrice("bottled_water", "water", "rain");
    expect(rainyPrice).toBe(80); // 100 * 0.8
  });
});
