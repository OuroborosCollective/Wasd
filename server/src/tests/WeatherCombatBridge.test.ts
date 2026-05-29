import { describe, it, expect, beforeEach } from "vitest";
import { WeatherCombatBridge } from "../modules/combat/WeatherCombatBridge.js";
import { CombatSystem } from "../modules/combat/CombatSystem.js";

describe("WeatherCombatBridge", () => {
  it("returns correct hit multipliers for different weather", () => {
    expect(WeatherCombatBridge.getHitMultiplier("clear")).toBe(1.0);
    expect(WeatherCombatBridge.getHitMultiplier("rain")).toBe(0.95);
    expect(WeatherCombatBridge.getHitMultiplier("storm")).toBe(0.85);
    expect(WeatherCombatBridge.getHitMultiplier("fog")).toBe(0.8);
    expect(WeatherCombatBridge.getHitMultiplier("snow")).toBe(0.9);
    expect(WeatherCombatBridge.getHitMultiplier("unknown")).toBe(1.0);
  });

  it("returns correct damage multipliers for different weather", () => {
    expect(WeatherCombatBridge.getDamageMultiplier("clear")).toBe(1.0);
    expect(WeatherCombatBridge.getDamageMultiplier("rain")).toBe(1.0);
    expect(WeatherCombatBridge.getDamageMultiplier("storm")).toBe(1.1);
    expect(WeatherCombatBridge.getDamageMultiplier("fog")).toBe(1.0);
    expect(WeatherCombatBridge.getDamageMultiplier("snow")).toBe(0.9);
    expect(WeatherCombatBridge.getDamageMultiplier("unknown")).toBe(1.0);
  });
});

describe("CombatSystem Weather Integration", () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem();
  });

  it("applies weather damage multiplier to melee attacks", () => {
    const attacker = {
      id: "attacker",
      stamina: 100,
      skills: { combat: { level: 10 } }
    };
    const defenderClear = {
      id: "defender",
      health: 1000,
      skills: { combat: { level: 10 } }
    };
    const defenderStorm = {
      id: "defender",
      health: 1000,
      skills: { combat: { level: 10 } }
    };

    // We use the same attacker/defender state and reset combat sequence and stamina to ensure same RNG
    const resultClear = combat.attack(attacker, defenderClear, "clear");

    // Reset attacker state for perfect determinism comparison
    attacker.__areCombatSequence = 0;
    attacker.stamina = 100;

    const resultStorm = combat.attack(attacker, defenderStorm, "storm");

    if (resultClear.hit && resultStorm.hit) {
      // Storm has 1.1x damage multiplier
      expect(resultStorm.damage).toBeGreaterThanOrEqual(resultClear.damage);
      if (resultClear.damage > 0) {
        expect(resultStorm.damage).toBe(Math.floor(resultClear.damage * 1.1));
      }
    }
  });

  it("applies weather hit multiplier to melee attacks", () => {
    // This is hard to test with a single roll without mocking RNG,
    // but we can verify the hit chance logic if we exposed it or by statistical means.
    // Given the deterministic nature, we can verify that a specific seed that hits in clear
    // might miss in fog.

    const attacker = {
      id: "attacker",
      stamina: 100,
      skills: { combat: { level: 1 } }
    };
    const defender = {
      id: "defender",
      health: 100,
      skills: { combat: { level: 1 } }
    };

    // Find a state where it's a marginal hit
    // hitChance for 1 vs 1 is 0.65.
    // In fog, it's 0.65 * 0.8 = 0.52.

    let found = false;
    for (let i = 0; i < 100; i++) {
      attacker.__areCombatSequence = i;
      attacker.stamina = 100;
      defender.health = 100;
      const resClear = combat.attack(attacker, defender, "clear");

      attacker.__areCombatSequence = i;
      attacker.stamina = 100;
      defender.health = 100;
      const resFog = combat.attack(attacker, defender, "fog");

      if (resClear.hit && !resFog.hit) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});
