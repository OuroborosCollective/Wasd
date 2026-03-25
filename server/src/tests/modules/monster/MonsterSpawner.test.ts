import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MonsterSpawner } from "../../../modules/monster/MonsterSpawner.js";

describe("MonsterSpawner", () => {
  let spawner: MonsterSpawner;

  beforeEach(() => {
    spawner = new MonsterSpawner();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("spawns a monster with the given species and base stats", () => {
    // Mock Math.random to return predictable values for base stats
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const monster = spawner.spawn("goblin", "plains");

    expect(monster.species).toBe("goblin");
    expect(monster.strength).toBe(0.5);
    expect(monster.speed).toBe(0.5);
    expect(monster.aggression).toBe(0.5);
    expect(monster.intelligence).toBe(0.5);
    expect(monster.resilience).toBe(0.5);
    // Plains biome shouldn't add biome mutations. Rare variant is false (0.5 > 0.08).
    expect(monster.mutations).toEqual([]);
  });

  it("applies 'snow' biome mutations correctly", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const monster = spawner.spawn("yeti", "snow");

    // Resilience is base (0.5) + snow modifier (0.2)
    expect(monster.resilience).toBeCloseTo(0.7);
    expect(monster.mutations).toContain("frost_resistance");
  });

  it("applies 'swamp' biome mutations correctly", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const monster = spawner.spawn("troll", "swamp");

    // Aggression is base (0.5) + swamp modifier (0.15)
    expect(monster.aggression).toBeCloseTo(0.65);
    expect(monster.mutations).toContain("swamp_hunger");
  });

  it("triggers 'rare_variant' mutation when Math.random is below 0.08", () => {
    // 0.05 is < 0.08, so rare_variant should trigger
    vi.spyOn(Math, "random").mockReturnValue(0.05);

    const monster = spawner.spawn("dragon", "mountains");

    expect(monster.mutations).toContain("rare_variant");
  });

  it("does not trigger 'rare_variant' mutation when Math.random is 0.08 or higher", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.08);

    const monster = spawner.spawn("dragon", "mountains");

    expect(monster.mutations).not.toContain("rare_variant");
  });

  it("applies multiple mutations if biome and rare_variant both trigger", () => {
    // 0.05 < 0.08, so rare_variant should trigger. Snow biome will add frost_resistance.
    vi.spyOn(Math, "random").mockReturnValue(0.05);

    const monster = spawner.spawn("ice_elemental", "snow");

    expect(monster.mutations).toContain("frost_resistance");
    expect(monster.mutations).toContain("rare_variant");
    expect(monster.mutations.length).toBe(2);
  });
});
