import { describe, it, expect } from "vitest";
import { WeatherEconomyBridge } from "../modules/economy/WeatherEconomyBridge.js";

describe("WeatherEconomyBridge", () => {
  const bridge = new WeatherEconomyBridge();

  it("increases wood price in storm", () => {
    expect(bridge.getPriceMultiplier("wood", "storm")).toBe(1.5);
  });

  it("decreases mushroom price in rain", () => {
    expect(bridge.getPriceMultiplier("mushrooms", "rain")).toBe(0.8);
  });

  it("increases water price in heatwave", () => {
    expect(bridge.getPriceMultiplier("water", "heatwave")).toBe(2.0);
  });

  it("increases wool price in snow", () => {
    expect(bridge.getPriceMultiplier("wool", "snow")).toBe(1.4);
  });

  it("returns 1.0 for neutral conditions", () => {
    expect(bridge.getPriceMultiplier("wood", "clear")).toBe(1.0);
  });
});
