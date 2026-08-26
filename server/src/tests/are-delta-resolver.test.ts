import { describe, expect, it } from "vitest";
import { reduceCombatDelta, resolveCombatDelta } from "../modules/combat/CombatDeltaResolver.js";

describe("ARE delta resolver", () => {
  it("creates a deterministic delta without changing inputs", () => {
    const actor = { id: "p1", stamina: 50, skills: { combat: { level: 50 } } };
    const target = { id: "m1", health: 100, skills: { combat: { level: 1 } } };
    const delta = resolveCombatDelta("melee", actor, target, { tick: 10, sequence: 1, weaponBonus: 5 });
    const patch = reduceCombatDelta(actor, target, delta);

    expect(delta.kind).toBe("combat_delta");
    expect(patch.attacker.id).toBe("p1");
    expect(patch.defender.id).toBe("m1");
    expect(actor.stamina).toBe(50);
    expect(target.health).toBe(100);
  });
});
