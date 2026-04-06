import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mutateMonster } from "../../../modules/monster/MonsterMutation.js";

describe("MonsterMutation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseDna = {
    species: "goblin",
    resilience: 0.5,
    aggression: 0.5,
  };

  it("returns a clone with empty mutations array when biome has no effect and rare variant fails", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // 0.5 >= 0.08, rare_variant false

    const result = mutateMonster(baseDna, "plains");

    expect(result.species).toBe("goblin");
    expect(result.resilience).toBe(0.5);
    expect(result.aggression).toBe(0.5);
    expect(result.mutations).toEqual([]);

    // Ensure it's a clone, not the same reference
    expect(result).not.toBe(baseDna);
  });

  it("increases resilience and adds frost_resistance mutation in 'snow' biome", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = mutateMonster(baseDna, "snow");

    expect(result.resilience).toBeCloseTo(0.7); // 0.5 + 0.2
    expect(result.mutations).toContain("frost_resistance");
    expect(result.mutations.length).toBe(1);
    expect(result.aggression).toBe(0.5); // shouldn't change
  });

  it("increases aggression and adds swamp_hunger mutation in 'swamp' biome", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = mutateMonster(baseDna, "swamp");

    expect(result.aggression).toBeCloseTo(0.65); // 0.5 + 0.15
    expect(result.mutations).toContain("swamp_hunger");
    expect(result.mutations.length).toBe(1);
    expect(result.resilience).toBe(0.5); // shouldn't change
  });

  it("adds rare_variant mutation when Math.random is less than 0.08", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.05);

    const result = mutateMonster(baseDna, "plains");

    expect(result.mutations).toContain("rare_variant");
    expect(result.mutations.length).toBe(1);
  });

  it("applies multiple mutations if biome and rare_variant both trigger", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.05);

    const result = mutateMonster(baseDna, "snow");

    expect(result.resilience).toBeCloseTo(0.7);
    expect(result.mutations).toContain("frost_resistance");
    expect(result.mutations).toContain("rare_variant");
    expect(result.mutations.length).toBe(2);
  });
});
