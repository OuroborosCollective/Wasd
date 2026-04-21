import { describe, it, expect } from "vitest";
import { CombatSystem } from "../modules/combat/CombatSystem.js";

describe("CombatSystem with FX", () => {
  it("returns fx object on hit", () => {
    const sys = new CombatSystem();
    const attacker = { skills: { combat: { level: 10 } }, stamina: 100 };
    const defender = { skills: { combat: { level: 1 } }, health: 500, maxHealth: 500 };

    const result = sys.attack(attacker, defender);
    expect(result.success).toBe(true);
    if (result.hit) {
      expect(result.fx).toBeDefined();
      expect(["hit", "crit"]).toContain(result.fx!.kind);
      expect(result.fx!.n).toBeGreaterThan(0);
      expect(typeof result.crit).toBe("boolean");
      expect(typeof result.killed).toBe("boolean");
    } else {
      expect(result.fx).toBeDefined();
      expect(result.fx!.kind).toBe("miss");
    }
  });

  it("returns killed=true when defender reaches 0 HP", () => {
    const sys = new CombatSystem();
    const attacker = { skills: { combat: { level: 50 } }, stamina: 100 };
    const defender = { skills: { combat: { level: 1 } }, health: 1, maxHealth: 100 };

    const result = sys.attackWithWeapon(attacker, defender, 100);
    expect(result.success).toBe(true);
    if (result.hit) {
      expect(result.killed).toBe(true);
      expect(result.defenderHealth).toBe(0);
    }
  });

  it("spellStrike returns fx with crit or hit", () => {
    const sys = new CombatSystem();
    const attacker = { skills: { combat: { level: 10 } } };
    const defender = { skills: { combat: { level: 1 } }, health: 200, maxHealth: 200 };

    const result = sys.spellStrike(attacker, defender, 15);
    expect(result.success).toBe(true);
    expect(result.fx).toBeDefined();
    if (result.hit) {
      expect(["hit", "crit"]).toContain(result.fx!.kind);
    } else {
      expect(result.fx!.kind).toBe("miss");
    }
  });

  it("returns no_stamina reason when stamina is depleted", () => {
    const sys = new CombatSystem();
    const attacker = { skills: { combat: { level: 1 } }, stamina: 0 };
    const defender = { skills: { combat: { level: 1 } }, health: 100 };

    const result = sys.attack(attacker, defender);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("no_stamina");
  });
});
