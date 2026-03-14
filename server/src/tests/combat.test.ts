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

  it("attack() deducts 8 stamina on a successful attempt", () => {
    // Force hit by mocking Math.random to return 0 (always hits)
    vi.spyOn(Math, "random").mockReturnValue(0);
    const attacker = { stamina: 50, skills: { combat: { level: 5 } } };
    const defender = { health: 100, skills: { combat: { level: 1 } } };
    combat.attack(attacker, defender);
    expect(attacker.stamina).toBe(42);
    vi.restoreAllMocks();
  });

  // ---- hitChance -----------------------------------------------------------

  it("calculateHitChance() returns a value between 0.3 and 0.95", () => {
    const chance = combat.calculateHitChance(5, 5);
    expect(chance).toBeGreaterThanOrEqual(0.3);
    expect(chance).toBeLessThanOrEqual(0.95);
  });

  it("calculateHitChance() with equal levels returns 0.65", () => {
    expect(combat.calculateHitChance(5, 5)).toBeCloseTo(0.65);
  });

  it("calculateHitChance() clamps at 0.95 for overwhelmingly stronger attacker", () => {
    expect(combat.calculateHitChance(1000, 1)).toBe(0.95);
  });

  it("calculateHitChance() clamps at 0.3 for overwhelmingly weaker attacker", () => {
    expect(combat.calculateHitChance(1, 1000)).toBe(0.3);
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
    // Mock random to return a value that is NOT a dodge (dodge is min(0.3, def*0.02) = 0.02)
    // and IS a hit (hitChance is 0.5 + 5/(5+1)*0.3 = 0.75)
    // Value 0.5 is > 0.02 (not dodge) and < 0.75 (is hit)
    vi.spyOn(Math, "random").mockReturnValue(0.5);
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
