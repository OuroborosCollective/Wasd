import { describe, it, expect } from "vitest";
import { WeatherMagicBridge } from "../modules/magic/WeatherMagicBridge.js";
import { MagicSystem } from "../modules/magic/MagicSystem.js";

describe("WeatherMagicBridge", () => {
  const bridge = new WeatherMagicBridge();

  it("boosts fire spells in heatwave", () => {
    expect(bridge.calculatePotency("fire", "heatwave")).toBe(1.5);
  });

  it("weakens fire spells in rain", () => {
    expect(bridge.calculatePotency("fire", "rain")).toBe(0.5);
  });

  it("boosts water spells in rain", () => {
    expect(bridge.calculatePotency("water", "rain")).toBe(1.5);
  });

  it("weakens water spells in heatwave", () => {
    expect(bridge.calculatePotency("water", "heatwave")).toBe(0.5);
  });

  it("boosts lightning spells in storm", () => {
    expect(bridge.calculatePotency("lightning", "storm")).toBe(1.5);
  });

  it("boosts frost spells in snow", () => {
    expect(bridge.calculatePotency("frost", "snow")).toBe(1.5);
  });

  it("returns 1.0 for generic spells", () => {
    expect(bridge.calculatePotency("arcane", "storm")).toBe(1.0);
  });
});

describe("MagicSystem Integration", () => {
  const system = new MagicSystem();

  it("applies weather multiplier to spell potency", () => {
    const caster = { mana: 100 };
    const spell = { id: "fireball", type: "fire", cost: 10, potency: 20 };
    const result = system.cast(caster, spell, null, "heatwave");

    expect(result.success).toBe(true);
    expect(result.multiplier).toBe(1.5);
    expect(result.potency).toBe(30);
  });
});
