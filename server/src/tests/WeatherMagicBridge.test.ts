import { describe, it, expect } from "vitest";
import { MagicSystem } from "../modules/magic/MagicSystem.js";

describe("WeatherMagicBridge integration in MagicSystem", () => {
  const magicSystem = new MagicSystem();

  const fireSpell = { id: "fireball", type: "fire", cost: 10, potency: 20 };
  const waterSpell = { id: "water_jet", type: "water", cost: 10, potency: 20 };
  const caster = { mana: 100 };

  it("should apply 1.5x multiplier to fire spells during a heatwave", () => {
    const result = magicSystem.cast({ ...caster }, fireSpell, null, "heatwave");
    expect(result.multiplier).toBe(1.5);
    expect(result.potency).toBe(30);
  });

  it("should apply 0.5x multiplier to fire spells during rain", () => {
    const result = magicSystem.cast({ ...caster }, fireSpell, null, "rain");
    expect(result.multiplier).toBe(0.5);
    expect(result.potency).toBe(10);
  });

  it("should apply 1.5x multiplier to water spells during rain", () => {
    const result = magicSystem.cast({ ...caster }, waterSpell, null, "rain");
    expect(result.multiplier).toBe(1.5);
    expect(result.potency).toBe(30);
  });

  it("should apply 1.0x multiplier when weather does not affect the spell type", () => {
    const result = magicSystem.cast({ ...caster }, fireSpell, null, "snow");
    expect(result.multiplier).toBe(1.0);
    expect(result.potency).toBe(20);
  });

  it("should be deterministic and return same results for same inputs", () => {
    const result1 = magicSystem.cast({ ...caster }, fireSpell, null, "storm");
    const result2 = magicSystem.cast({ ...caster }, fireSpell, null, "storm");
    expect(result1.potency).toBe(result2.potency);
    expect(result1.potency).toBe(10);
  });
});
