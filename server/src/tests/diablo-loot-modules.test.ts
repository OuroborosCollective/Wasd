import { describe, it, expect } from "vitest";
import { generateItem, rarityRoll, pickWeighted, randInt } from "../modules/loot/diabloItemGen.js";
import { rollTreasure } from "../modules/loot/diabloTreasure.js";
import { computeSetBonuses } from "../modules/items/setBonuses.js";
import { POWERS, applyLegendaryPowersFromEquipment } from "../modules/items/legendaryPowers.js";
import { smartLootPickBase } from "../modules/loot/smartLoot.js";
import { identify } from "../modules/loot/itemIdentify.js";
import { rerollOneStat } from "../modules/loot/itemEnchant.js";
import { applyGemsStats, type SocketedItem } from "../modules/loot/socketedItem.js";
import { createDungeon } from "../modules/dungeon/dungeonInstance.js";

const sampleBase = {
  id: "sword_iron",
  name: "Iron Sword",
  slot: "weapon" as const,
  minDmg: 5,
  maxDmg: 10,
  tags: ["melee", "sword"],
};

const sampleAffixes = [
  {
    id: "of_fury",
    name: "of Fury",
    group: "dmg_inc",
    tagsAny: ["melee"],
    minLevel: 1,
    weight: 10,
    rolls: [{ stat: "str" as const, min: 1, max: 3 }],
  },
  {
    id: "of_winter",
    name: "of Winter",
    group: "res_cold",
    tagsAny: ["sword"],
    minLevel: 1,
    weight: 10,
    rolls: [{ stat: "coldRes" as const, min: 5, max: 15 }],
  },
];

describe("Diablo-style loot modules", () => {
  it("generateItem produces uid and stats for rare+", () => {
    const item = generateItem({
      base: sampleBase,
      ilvl: 10,
      rarity: "rare",
      affixes: sampleAffixes,
    });
    expect(item.uid.length).toBeGreaterThan(10);
    expect(item.rarity).toBe("rare");
    expect(item.stats.dmgMin).toBe(5);
    expect(item.stats.dmgMax).toBe(10);
    const statKeys = Object.keys(item.stats).filter((k) => k !== "dmgMin" && k !== "dmgMax");
    expect(statKeys.length).toBeGreaterThan(0);
  });

  it("rollTreasure resolves nested TC and base", () => {
    const bases = { sword_iron: sampleBase };
    const tcs = {
      tc_a: { id: "tc_a", picks: 2, entries: [{ type: "tc" as const, tcId: "tc_b", weight: 1 }] },
      tc_b: {
        id: "tc_b",
        picks: 1,
        entries: [
          { type: "gold" as const, min: 1, max: 2, weight: 1 },
          { type: "base" as const, baseId: "sword_iron", weight: 10 },
        ],
      },
    };
    const r = rollTreasure({ tcId: "tc_a", tcs, bases, affixes: sampleAffixes, ilvl: 5 });
    expect(r.gold).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(r.items)).toBe(true);
  });

  it("computeSetBonuses stacks at thresholds", () => {
    const sets = {
      s1: {
        id: "s1",
        name: "Test",
        pieceBaseIds: ["a"],
        bonuses: [
          { pieces: 2, stats: { str: 5 } },
          { pieces: 2, stats: { vit: 3 }, powerId: "p1" },
        ],
      },
    };
    const equipped = [
      { uid: "1", baseId: "a", name: "x", rarity: "set" as const, ilvl: 1, seed: 1, stats: {}, setId: "s1" },
      { uid: "2", baseId: "b", name: "y", rarity: "set" as const, ilvl: 1, seed: 1, stats: {}, setId: "s1" },
    ];
    const { stats, powers } = computeSetBonuses(equipped, sets);
    expect(stats.str).toBe(5);
    expect(stats.vit).toBe(3);
    expect(powers).toContain("p1");
  });

  it("legendary powers vampiric and execute", () => {
    expect(POWERS.lp_vampiric).toBeTruthy();
    const heal = POWERS.lp_vampiric.onHit?.({ attacker: { health: 10, maxHealth: 100 }, target: { health: 50, maxHealth: 100 }, dmg: 100, crit: false });
    expect(heal?.heal).toBe(8);
    const exec = POWERS.lp_execute.onHit?.({
      attacker: { health: 10, maxHealth: 100 },
      target: { health: 10, maxHealth: 100 },
      dmg: 20,
      crit: false,
    });
    expect(exec?.extraDmg).toBe(7);
  });

  it("applyLegendaryPowersFromEquipment reads weapon legendaryPowerId", () => {
    const r = applyLegendaryPowersFromEquipment(
      { weapon: { legendaryPowerId: "lp_vampiric" } },
      {
        attacker: { health: 50, maxHealth: 100 },
        target: { health: 100, maxHealth: 100 },
        dmg: 50,
        crit: false,
      }
    );
    expect(r.heal).toBe(4);
  });

  it("smartLootPickBase prefers matching tags", () => {
    const bases = [
      { id: "a", tags: ["melee"] },
      { id: "b", tags: ["ranged"] },
    ];
    let melee = 0;
    let sampleIndex = 0;
    const deterministicRng = {
      nextFloat: () => (sampleIndex++ % 80) / 80,
    } as any;
    for (let i = 0; i < 80; i++) {
      const { base } = smartLootPickBase(bases, ["melee"], { noLegendaryStreak: 0 }, deterministicRng);
      if (base.id === "a") melee++;
    }
    expect(melee).toBeGreaterThan(40);
  });

  it("identify preserves uid and seed", () => {
    const unid = { uid: "fixed-uid", baseId: "sword_iron", rarity: "magic" as const, ilvl: 3, seed: 999, identified: false as const };
    const out = identify(unid, sampleBase, sampleAffixes);
    expect(out.identified).toBe(true);
    expect(out.uid).toBe("fixed-uid");
    expect(out.seed).toBe(999);
  });

  it("rerollOneStat keeps allowed stats", () => {
    const item = {
      uid: "x",
      baseId: "sword_iron",
      name: "T",
      rarity: "magic" as const,
      ilvl: 20,
      seed: 1,
      stats: { str: 5, coldRes: 12 },
    };
    rerollOneStat(item, ["str", "coldRes"], sampleAffixes);
    expect(Object.keys(item.stats).length).toBeGreaterThan(0);
    const hasStr = typeof item.stats.str === "number";
    const hasCold = typeof item.stats.coldRes === "number";
    expect(hasStr || hasCold).toBe(true);
  });

  it("applyGemsStats merges gem stats", () => {
    const item: SocketedItem = {
      uid: "u",
      baseId: "sword_iron",
      name: "S",
      rarity: "common",
      ilvl: 1,
      seed: 1,
      stats: { str: 2 },
      sockets: 1,
      gems: ["ruby_small"],
    };
    const gems = { ruby_small: { id: "ruby_small", stats: { str: 3 } } };
    const merged = applyGemsStats(item, gems);
    expect(merged.str).toBe(5);
  });

  it("createDungeon returns id and seed", () => {
    const d = createDungeon(5, "party1");
    expect(d.tier).toBe(5);
    expect(d.partyId).toBe("party1");
    expect(d.seed).toBeGreaterThanOrEqual(0);
  });

  it("pickWeighted and randInt are deterministic bounds", () => {
    const x = pickWeighted([
      { weight: 1, v: "a" },
      { weight: 1, v: "b" },
    ]);
    expect(["a", "b"]).toContain(x.v);
    const n = randInt(3, 3);
    expect(n).toBe(3);
    expect(["common", "magic", "rare", "legendary", "set"]).toContain(rarityRoll(0));
  });
});
