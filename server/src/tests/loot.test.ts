import { describe, it, expect, beforeEach } from "vitest";
import { AffixSystem } from "../modules/loot/AffixSystem.js";
import { ItemGenerator } from "../modules/loot/ItemGenerator.js";
import { LootTables } from "../modules/loot/LootTables.js";

// ---------------------------------------------------------------------------
// AffixSystem
// ---------------------------------------------------------------------------
describe("AffixSystem", () => {
  const allAffixes = [
    "plus_strength",
    "plus_health",
    "plus_attack_speed",
    "plus_mining",
    "plus_fire_resistance",
  ];

  let affixSystem: AffixSystem;

  beforeEach(() => { affixSystem = new AffixSystem(); });

  it("common rarity rolls 0 affixes", () => {
    expect(affixSystem.rollAffixes("common")).toHaveLength(0);
  });

  it("uncommon rarity rolls 1 affix", () => {
    expect(affixSystem.rollAffixes("uncommon")).toHaveLength(1);
  });

  it("rare rarity rolls 2 affixes", () => {
    expect(affixSystem.rollAffixes("rare")).toHaveLength(2);
  });

  it("epic rarity rolls 3 affixes", () => {
    expect(affixSystem.rollAffixes("epic")).toHaveLength(3);
  });

  it("legendary rarity rolls 4 affixes", () => {
    expect(affixSystem.rollAffixes("legendary")).toHaveLength(4);
  });

  it("mythic rarity rolls 5 affixes", () => {
    expect(affixSystem.rollAffixes("mythic")).toHaveLength(5);
  });

  it("unknown rarity rolls 0 affixes", () => {
    expect(affixSystem.rollAffixes("unknown_rarity")).toHaveLength(0);
  });

  it("affixes returned are a subset of the known affix pool", () => {
    const affixes = affixSystem.rollAffixes("legendary");
    affixes.forEach((a) => expect(allAffixes).toContain(a));
  });

  it("mythic affixes contain all pool entries", () => {
    const affixes = affixSystem.rollAffixes("mythic");
    allAffixes.forEach((a) => expect(affixes).toContain(a));
  });
});

// ---------------------------------------------------------------------------
// ItemGenerator
// ---------------------------------------------------------------------------
describe("ItemGenerator", () => {
  let generator: ItemGenerator;

  beforeEach(() => { generator = new ItemGenerator(); });

  it("generates an item with the correct baseId", () => {
    const item = generator.generate("iron_sword", "common");
    expect(item.id).toBe("iron_sword");
  });

  it("generates an item with the correct rarity", () => {
    const item = generator.generate("potion", "rare");
    expect(item.rarity).toBe("rare");
  });

  it("generates an item with empty affixes by default", () => {
    const item = generator.generate("helm", "common");
    expect(item.affixes).toEqual([]);
  });

  it("preserves provided affixes", () => {
    const affixes = ["plus_strength", "plus_health"];
    const item = generator.generate("chestplate", "epic", affixes);
    expect(item.affixes).toEqual(affixes);
  });

  it("includes a generatedAt timestamp", () => {
    const before = Date.now();
    const item = generator.generate("ring", "uncommon");
    const after = Date.now();
    expect(item.generatedAt).toBeGreaterThanOrEqual(before);
    expect(item.generatedAt).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// LootTables
// ---------------------------------------------------------------------------
describe("LootTables", () => {
  it("wolf loot table exists and has 3 entries", () => {
    expect(LootTables.wolf).toHaveLength(3);
  });

  it("wolf loot table contains wolf_pelt with 65% chance", () => {
    const pelt = LootTables.wolf.find((e) => e.id === "wolf_pelt");
    expect(pelt).toBeDefined();
    expect(pelt!.chance).toBeCloseTo(0.65);
  });

  it("wolf loot table contains alpha_claw as rare", () => {
    const claw = LootTables.wolf.find((e) => e.id === "alpha_claw");
    expect(claw).toBeDefined();
    expect(claw!.rarity).toBe("rare");
  });

  it("skeleton loot table has 3 entries", () => {
    expect(LootTables.skeleton).toHaveLength(3);
  });

  it("skeleton loot table contains grave_ring at 3% chance", () => {
    const ring = LootTables.skeleton.find((e) => e.id === "grave_ring");
    expect(ring).toBeDefined();
    expect(ring!.chance).toBeCloseTo(0.03);
  });

  it("ruin_cache loot table has 3 entries", () => {
    expect(LootTables.ruin_cache).toHaveLength(3);
  });

  it("ruin_cache contains forgotten_sigil as legendary", () => {
    const sigil = LootTables.ruin_cache.find((e) => e.id === "forgotten_sigil");
    expect(sigil).toBeDefined();
    expect(sigil!.rarity).toBe("legendary");
  });

  it("all loot table entries have id, chance, and rarity fields", () => {
    for (const entries of Object.values(LootTables)) {
      for (const entry of entries) {
        expect(entry).toHaveProperty("id");
        expect(entry).toHaveProperty("chance");
        expect(entry).toHaveProperty("rarity");
      }
    }
  });
});
