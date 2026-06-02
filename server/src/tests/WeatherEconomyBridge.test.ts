import { describe, it, expect } from "vitest";
import { WeatherEconomyBridge } from "../modules/economy/WeatherEconomyBridge.js";

describe("WeatherEconomyBridge", () => {
  const bridge = new WeatherEconomyBridge();

  it("increases water price in heatwave", () => {
    expect(bridge.getPriceMultiplier("water", "heatwave")).toBe(2.0);
  });
});
