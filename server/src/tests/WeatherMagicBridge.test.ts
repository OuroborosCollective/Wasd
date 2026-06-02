import { describe, it, expect } from "vitest";
import { WeatherMagicBridge } from "../modules/magic/WeatherMagicBridge.js";
describe("WeatherMagicBridge", () => {
  const bridge = new WeatherMagicBridge();
  it("boosts fire spells in heatwave", () => { expect(bridge.calculatePotency("fire", "heatwave")).toBe(1.5); });
});
