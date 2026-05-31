import { describe, it, expect } from "vitest";
import { WeatherMagicBridge } from "../modules/magic/WeatherMagicBridge.js";
import { MagicSystem } from "../modules/magic/MagicSystem.js";

describe("WeatherMagicBridge", () => {
  it("should provide 1.5x multiplier for Fire in heatwave", () => {
    expect(WeatherMagicBridge.getPotencyMultiplier("fire", "heatwave")).toBe(1.5);
  });

  it("should provide 0.5x multiplier for Fire in rain", () => {
    expect(WeatherMagicBridge.getPotencyMultiplier("fire", "rain")).toBe(0.5);
  });

  it("should provide 1.5x multiplier for Water in rain", () => {
    expect(WeatherMagicBridge.getPotencyMultiplier("water", "rain")).toBe(1.5);
  });

  it("should provide 0.5x multiplier for Water in heatwave", () => {
    expect(WeatherMagicBridge.getPotencyMultiplier("water", "heatwave")).toBe(0.5);
  });

  it("should provide 1.5x multiplier for Lightning in storm", () => {
    expect(WeatherMagicBridge.getPotencyMultiplier("lightning", "storm")).toBe(1.5);
  });

  it("should provide 1.5x multiplier for Frost in snow", () => {
    expect(WeatherMagicBridge.getPotencyMultiplier("frost", "snow")).toBe(1.5);
  });

  it("should provide 1.0x multiplier for neutral magic in any weather", () => {
    expect(WeatherMagicBridge.getPotencyMultiplier("neutral", "storm")).toBe(1.0);
    expect(WeatherMagicBridge.getPotencyMultiplier("neutral", "clear")).toBe(1.0);
  });
});

describe("MagicSystem Integration", () => {
  const magic = new MagicSystem();
  const caster = { id: "p1", mana: 100 };
  const spell = { id: "fireball", element: "fire", cost: 10, potency: 20 };
  const target = { id: "m1" };

  it("should apply weather multiplier to spell potency in heatwave", () => {
    const result = magic.cast(caster, spell, target, "heatwave");
    expect(result.success).toBe(true);
    expect(result.finalPotency).toBe(30); // 20 * 1.5
    expect(result.weatherApplied).toBe("heatwave");
  });

  it("should apply weather multiplier to spell potency in rain", () => {
    const result = magic.cast(caster, spell, target, "rain");
    expect(result.success).toBe(true);
    expect(result.finalPotency).toBe(10); // 20 * 0.5
    expect(result.weatherApplied).toBe("rain");
  });
});
