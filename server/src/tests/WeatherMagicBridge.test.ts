import { describe, it, expect } from "vitest";
import { WeatherMagicBridge } from "../modules/magic/WeatherMagicBridge.js";
import { MagicSystem } from "../modules/magic/MagicSystem.js";

describe("WeatherMagicBridge", () => {
  it("returns 1.0 for unknown weather or missing weather", () => {
    expect(WeatherMagicBridge.getMultiplier("fire", undefined)).toBe(1.0);
    expect(WeatherMagicBridge.getMultiplier("fire", "unknown")).toBe(1.0);
  });

  it("applies rain modifiers correctly", () => {
    expect(WeatherMagicBridge.getMultiplier("water", "rain")).toBe(1.5);
    expect(WeatherMagicBridge.getMultiplier("fire", "rain")).toBe(0.5);
    expect(WeatherMagicBridge.getMultiplier("lightning", "rain")).toBe(1.2);
    expect(WeatherMagicBridge.getMultiplier("frost", "rain")).toBe(1.0);
  });

  it("applies storm modifiers correctly", () => {
    expect(WeatherMagicBridge.getMultiplier("lightning", "storm")).toBe(2.0);
    expect(WeatherMagicBridge.getMultiplier("water", "storm")).toBe(1.2);
    expect(WeatherMagicBridge.getMultiplier("fire", "storm")).toBe(0.5);
  });

  it("applies heatwave modifiers correctly", () => {
    expect(WeatherMagicBridge.getMultiplier("fire", "heatwave")).toBe(1.5);
    expect(WeatherMagicBridge.getMultiplier("water", "heatwave")).toBe(0.5);
    expect(WeatherMagicBridge.getMultiplier("frost", "heatwave")).toBe(0.5);
  });

  it("is case-insensitive for weather states", () => {
    expect(WeatherMagicBridge.getMultiplier("fire", "HEATWAVE")).toBe(1.5);
    expect(WeatherMagicBridge.getMultiplier("water", "Rain")).toBe(1.5);
  });
});

describe("MagicSystem Integration", () => {
  const magic = new MagicSystem();
  const caster = { mana: 100 };
  const target = { id: "target-1" };

  it("calculates final effect with weather multiplier", () => {
    const spell = { id: "fireball", cost: 10, element: "fire", effectValue: 20 };
    const result = magic.cast(caster, spell, target, "heatwave");

    expect(result.success).toBe(true);
    expect(result.multiplier).toBe(1.5);
    expect(result.finalEffect).toBe(30); // 20 * 1.5
    expect(caster.mana).toBe(90);
  });

  it("defaults to 1.0 multiplier if no weather is provided", () => {
    const spell = { id: "fireball", cost: 10, element: "fire", effectValue: 20 };
    const result = magic.cast(caster, spell, target);

    expect(result.multiplier).toBe(1.0);
    expect(result.finalEffect).toBe(20);
  });

  it("handles reduced effects in rain for fire spells", () => {
    const spell = { id: "fireball", cost: 10, element: "fire", effectValue: 20 };
    const result = magic.cast(caster, spell, target, "rain");

    expect(result.multiplier).toBe(0.5);
    expect(result.finalEffect).toBe(10);
  });
});
