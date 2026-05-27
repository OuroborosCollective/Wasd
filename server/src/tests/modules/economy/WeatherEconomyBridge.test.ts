import { describe, it, expect, beforeEach } from "vitest";
import { WeatherSystem } from "../../../modules/world/WeatherSystem.js";
import { EconomySystem } from "../../../modules/economy/EconomySystem.js";
import { WeatherEconomyBridge } from "../../../modules/economy/WeatherEconomyBridge.js";

describe("WeatherEconomyBridge Determinism", () => {
  let weather: WeatherSystem;
  let economy: EconomySystem;
  let bridge: WeatherEconomyBridge;

  beforeEach(() => {
    weather = new WeatherSystem();
    economy = new EconomySystem();
    bridge = new WeatherEconomyBridge(weather, economy);
  });

  it("should produce identical prices for the same tick", () => {
    const tick = 12345;

    // First run
    bridge.syncPrices(tick);
    const price1 = economy.getPrice("wolf_pelt");
    const mana1 = economy.getPrice("minor_mana_draught");

    // Reset and second run
    economy.resetPrices();
    bridge.syncPrices(tick);
    const price2 = economy.getPrice("wolf_pelt");
    const mana2 = economy.getPrice("minor_mana_draught");

    expect(price1).toBe(price2);
    expect(mana1).toBe(mana2);
    expect(price1).toBeGreaterThan(0);
  });

  it("should change prices based on weather (e.g., heatwave)", () => {
    // We know nextWeather(seed) is states[seed % 6]
    // states = ["clear","rain","storm","fog","snow","heatwave"]
    // heatwave is index 5
    const tick = 5;
    expect(weather.nextWeather(tick)).toBe("heatwave");

    const baseManaPrice = economy.getPrice("minor_mana_draught");
    bridge.syncPrices(tick);
    const adjustedManaPrice = economy.getPrice("minor_mana_draught");

    expect(adjustedManaPrice).toBeGreaterThan(baseManaPrice);
  });

  it("should change prices based on weather (e.g., snow)", () => {
    // snow is index 4
    const tick = 4;
    expect(weather.nextWeather(tick)).toBe("snow");

    const basePeltPrice = economy.getPrice("wolf_pelt");
    bridge.syncPrices(tick);
    const adjustedPeltPrice = economy.getPrice("wolf_pelt");

    expect(adjustedPeltPrice).toBeGreaterThan(basePeltPrice);
  });
});
