import { describe, it, expect, beforeEach, vi } from "vitest";
import { CombatSystem } from "../modules/combat/CombatSystem.js";

// ---------------------------------------------------------------------------
// CombatSystem
// ---------------------------------------------------------------------------
describe("CombatSystem", () => {
  let combat: CombatSystem;

  beforeEach(() => { combat = new CombatSystem(); });

  // ---- stamina check -------------------------------------------------------

  it("attack() returns success: false when attacker has 0 stamina", () => {
    const attacker = { stamina: 0, skills: { combat: { level: 5 } } };
    const defender = { health: 100, skills: { combat: { level: 1 } } };
    const result = combat.attack(attacker, defender);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("no_stamina");
  });

  it("attack() returns success: false when attacker stamina is negative", () => {
    const attacker = { stamina: -1, skills: {} };
    const defender = { health: 100 };
    expect(combat.attack(attacker, defender).success).toBe(false);
  });

  it("attack() deducts 10 stamina on a successful attempt", () => {
    // Force hit by mocking Math.random to return 0 (always hits)
    vi.spyOn(Math, "random").mockReturnValue(0);
    const attacker = { stamina: 50, skills: { combat: { level: 5 } } };
    const defender = { health: 100, skills: { combat: { level: 1 } } };
    combat.attack(attacker, defender);
    expect(attacker.stamina).toBe(40);
    vi.restoreAllMocks();
  });

  // ---- hitChance -----------------------------------------------------------

  it("hitChance() returns a value between 0.1 and 0.95", () => {
    const attacker = { skills: { combat: { level: 5 } } };
    const defender = { skills: { combat: { level: 5 } } };
    const chance = combat.hitChance(attacker, defender);
    expect(chance).toBeGreaterThanOrEqual(0.1);
    expect(chance).toBeLessThanOrEqual(0.95);
  });

  it("hitChance() with equal levels returns 0.5", () => {
    const attacker = { skills: { combat: { level: 4 } } };
    const defender = { skills: { combat: { level: 4 } } };
    expect(combat.hitChance(attacker, defender)).toBeCloseTo(0.5);
  });

  it("hitChance() defaults to level 1 when skills are missing", () => {
    const chance = combat.hitChance({}, {});
    // 1/(1+1) = 0.5
    expect(chance).toBeCloseTo(0.5);
  });

  it("hitChance() clamps at 0.95 for overwhelmingly stronger attacker", () => {
    const attacker = { skills: { combat: { level: 1000 } } };
    const defender = { skills: { combat: { level: 1 } } };
    expect(combat.hitChance(attacker, defender)).toBe(0.95);
  });

  it("hitChance() clamps at 0.1 for overwhelmingly weaker attacker", () => {
    const attacker = { skills: { combat: { level: 1 } } };
    const defender = { skills: { combat: { level: 1000 } } };
    expect(combat.hitChance(attacker, defender)).toBe(0.1);
  });

  // ---- calculateDamage -----------------------------------------------------

  it("calculateDamage() returns at least 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const attacker = { skills: { combat: { level: 1 } } };
    const defender = { skills: { combat: { level: 100 } } };
    expect(combat.calculateDamage(attacker, defender)).toBeGreaterThanOrEqual(1);
    vi.restoreAllMocks();
  });

  it("calculateDamage() increases with attacker level", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const defender = { skills: { combat: { level: 1 } } };
    const weak = { skills: { combat: { level: 1 } } };
    const strong = { skills: { combat: { level: 10 } } };
    const weakDmg = combat.calculateDamage(weak, defender);
    const strongDmg = combat.calculateDamage(strong, defender);
    expect(strongDmg).toBeGreaterThan(weakDmg);
    vi.restoreAllMocks();
  });

  // ---- attack outcomes -----------------------------------------------------

  it("attack() with guaranteed hit reduces defender health", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const attacker = { stamina: 50, skills: { combat: { level: 5 } } };
    const defender = { health: 100, skills: { combat: { level: 1 } } };
    const result = combat.attack(attacker, defender);
    expect(result.hit).toBe(true);
    expect(defender.health).toBeLessThan(100);
    vi.restoreAllMocks();
  });

  it("attack() defender health never drops below 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const attacker = { stamina: 100, skills: { combat: { level: 100 } } };
    const defender = { health: 1, skills: { combat: { level: 1 } } };
    combat.attack(attacker, defender);
    expect(defender.health).toBeGreaterThanOrEqual(0);
    vi.restoreAllMocks();
  });

  it("attack() with guaranteed miss returns hit: false and damage: 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const attacker = { stamina: 50, skills: { combat: { level: 1 } } };
    const defender = { health: 100, skills: { combat: { level: 1 } } };
    const result = combat.attack(attacker, defender);
    expect(result.hit).toBe(false);
    expect(result.damage).toBe(0);
    vi.restoreAllMocks();
  });

  it("attack() hit result includes defenderHealth", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const attacker = { stamina: 50, skills: { combat: { level: 5 } } };
    const defender = { health: 100, skills: { combat: { level: 1 } } };
    const result = combat.attack(attacker, defender);
    expect(result).toHaveProperty("defenderHealth");
    vi.restoreAllMocks();
  });
});
