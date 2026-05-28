import { describe, it, expect, beforeEach, vi } from "vitest";
import { WeatherCombatBridge } from "../../../modules/combat/WeatherCombatBridge.js";
import { CombatSystem } from "../../../modules/combat/CombatSystem.js";

describe("WeatherCombatBridge", () => {
  it("returns default modifiers when no weather is provided", () => {
    const mods = WeatherCombatBridge.getModifiers();
    expect(mods.hitChance).toBe(1.0);
    expect(mods.damage).toBe(1.0);
  });

  it("returns correct modifiers for rain", () => {
    const mods = WeatherCombatBridge.getModifiers("rain");
    expect(mods.hitChance).toBe(0.9);
    expect(mods.damage).toBe(1.0);
  });

  it("returns correct modifiers for storm", () => {
    const mods = WeatherCombatBridge.getModifiers("storm");
    expect(mods.hitChance).toBe(0.8);
    expect(mods.damage).toBe(1.1);
  });

  it("returns correct modifiers for fog", () => {
    const mods = WeatherCombatBridge.getModifiers("fog");
    expect(mods.hitChance).toBe(0.7);
    expect(mods.damage).toBe(1.0);
  });

  it("returns correct modifiers for snow", () => {
    const mods = WeatherCombatBridge.getModifiers("snow");
    expect(mods.hitChance).toBe(0.85);
    expect(mods.damage).toBe(0.9);
  });

  it("returns correct modifiers for heatwave", () => {
    const mods = WeatherCombatBridge.getModifiers("heatwave");
    expect(mods.hitChance).toBe(0.95);
    expect(mods.damage).toBe(1.15);
  });

  it("returns default modifiers for clear weather", () => {
    const mods = WeatherCombatBridge.getModifiers("clear");
    expect(mods.hitChance).toBe(1.0);
    expect(mods.damage).toBe(1.0);
  });

  it("returns default modifiers for unknown weather", () => {
    const mods = WeatherCombatBridge.getModifiers("unknown");
    expect(mods.hitChance).toBe(1.0);
    expect(mods.damage).toBe(1.0);
  });
});

describe("CombatSystem Weather Integration", () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem();
  });

  it("applies weather modifiers to hit chance", () => {
    const attacker = { skills: { combat: { level: 10 } } };
    const defender = { skills: { combat: { level: 10 } } };

    const baseHitChance = combat.calculateHitChance(attacker, defender);
    const rainHitChance = combat.calculateHitChance(attacker, defender, "rain");

    expect(rainHitChance).toBeLessThan(baseHitChance);
    expect(rainHitChance).toBeCloseTo(baseHitChance * 0.9);
  });

  it("applies weather modifiers to damage", () => {
    const attacker = { skills: { combat: { level: 10 } } };
    const defender = { skills: { combat: { level: 10 } } };

    vi.spyOn(combat as any, "nextInt").mockReturnValue(0);

    const baseDamage = combat.calculateDamage(attacker, defender);
    const stormDamage = combat.calculateDamage(attacker, defender, 0, undefined, "storm");

    expect(stormDamage).toBeGreaterThan(baseDamage);
    expect(stormDamage).toBe(Math.floor(baseDamage * 1.1));

    vi.restoreAllMocks();
  });
});
