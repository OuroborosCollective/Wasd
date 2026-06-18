import { describe, expect, it } from "vitest";
import { CombatDirector, type XPGainEvent } from "../../combat/CombatDirector.js";
import type { PlayerStatsDirector } from "../PlayerStatsDirector.js";
import { XPDeltaRouter } from "../XPDeltaRouter.js";

function item(signature: string): any {
  return { signature };
}

describe("XP causality", () => {
  it("derives combat XP from server equipment material without fake tier fallback", () => {
    const director = new CombatDirector();
    director.setTick(42);

    const iron = director.calculateAttackXP(
      "player_1",
      { MAIN_HAND: item("base:blade_3|material:material_iron") },
      true,
      100,
      false,
    )[0];

    const starMetal = director.calculateAttackXP(
      "player_1",
      { MAIN_HAND: item("base:blade_3|material:material_star_metal") },
      true,
      100,
      false,
    )[0];

    expect(iron).toMatchObject({ skillId: "sword_mastery", amount: 50, source: "attack", tick: 42 });
    expect(starMetal).toMatchObject({ skillId: "sword_mastery", amount: 87, source: "attack", tick: 42 });
    expect(starMetal.amount).toBeGreaterThan(iron.amount);
  });

  it("routes kill XP to the equipped weapon skill instead of hardcoded sword mastery", () => {
    const director = new CombatDirector();
    director.setTick(7);

    const [event] = director.grantKillXPForEquipment(
      "player_archer",
      33,
      { MAIN_HAND: item("base:bow_4|material:material_steel") },
    );

    expect(event).toMatchObject({ playerId: "player_archer", skillId: "archery", amount: 33, source: "kill", tick: 7 });
  });

  it("preserves gather/craft/quest/system XP provenance when flushing to stats", () => {
    const router = new XPDeltaRouter();
    const captured: XPGainEvent[] = [];
    const stats = {
      processXPevents(events: XPGainEvent[]) {
        captured.push(...events);
      },
    } as unknown as PlayerStatsDirector;

    router.enqueueMany([
      { kind: "xp_delta", source: "gather_delta", tick: 10, playerId: "p", skillId: "mining", amount: 12, sourceId: "node:ore" },
      { kind: "xp_delta", source: "craft_delta", tick: 10, playerId: "p", skillId: "smithing", amount: 8, sourceId: "recipe:bar" },
      { kind: "xp_delta", source: "quest_delta", tick: 10, playerId: "p", skillId: "combat", amount: 5, sourceId: "quest:first" },
      { kind: "xp_delta", source: "system_delta", tick: 10, playerId: "p", skillId: "evasion", amount: 3, sourceId: "migration" },
    ]);

    expect(router.flushToPlayerStats(stats, 10)).toBe(4);

    const sourcesBySkill = Object.fromEntries(captured.map((event) => [event.skillId, event.source]));
    expect(sourcesBySkill).toMatchObject({
      mining: "gather",
      smithing: "craft",
      combat: "quest",
      evasion: "system",
    });
  });
});
