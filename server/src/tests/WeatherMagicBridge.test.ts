import { describe, it, expect } from "vitest";
import { WeatherMagicBridge } from "../modules/weather/WeatherMagicBridge.js";
import { MagicSystem } from "../modules/magic/MagicSystem.js";
import { KAPPA } from "../core/are/Kappa.js";

describe("WeatherMagicBridge", () => {
  it("returns 1500 (1.5x) for Fire magic during Heatwave", () => {
    expect(WeatherMagicBridge.getMultiplier("heatwave", "fire")).toBe(1500);
  });

  it("returns 500 (0.5x) for Fire magic during Rain", () => {
    expect(WeatherMagicBridge.getMultiplier("rain", "fire")).toBe(500);
  });

  it("returns 2000 (2.0x) for Lightning magic during Storm", () => {
    expect(WeatherMagicBridge.getMultiplier("storm", "lightning")).toBe(2000);
  });

  it("returns KAPPA (1.0x) for unknown combinations", () => {
    expect(WeatherMagicBridge.getMultiplier("clear", "void")).toBe(KAPPA);
  });

  it("is case-insensitive", () => {
    expect(WeatherMagicBridge.getMultiplier("STORM", "LIGHTNING")).toBe(2000);
  });
});

describe("MagicSystem Integration with Weather", () => {
  const magic = new MagicSystem();
  const caster = { mana: 100 };
  const fireSpell = { id: "fireball", type: "fire", cost: 10, potency: 100 };

  it("applies weather multiplier to spell potency", () => {
    const result = magic.cast(caster, fireSpell, null, "heatwave");
    expect(result.success).toBe(true);
    expect(result.multiplier).toBe(1500);
    expect(result.potency).toBe(150); // 100 * 1.5
  });

  it("weakens spell potency in adverse weather", () => {
    const result = magic.cast(caster, fireSpell, null, "rain");
    expect(result.potency).toBe(50); // 100 * 0.5
  });
});
