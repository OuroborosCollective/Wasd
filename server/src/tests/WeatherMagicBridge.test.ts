import { describe, it, expect } from "vitest";
import { WeatherMagicBridge } from "../modules/magic/WeatherMagicBridge.js";
import { MagicSystem } from "../modules/magic/MagicSystem.js";

describe("WeatherMagicBridge", () => {
  const bridge = new WeatherMagicBridge();

  it("boosts fire spells in heatwave", () => {
    expect(bridge.calculatePotency("fire", "heatwave")).toBe(1.5);
  });

  it("returns 1.0 for generic spells", () => {
    expect(bridge.calculatePotency("arcane", "storm")).toBe(1.0);
  });
});
