import { describe, it, expect } from "vitest";
import { mutateMonster } from "../../../modules/monster/MonsterMutation.js";
import { SeededARERng } from "../../../core/determinism/AREDeterminism.js";

describe("MonsterMutation", () => {
  const baseDna = {
    species: "goblin",
    resilience: 0.5,
    aggression: 0.5,
  };

  it("returns a clone with empty mutations array when biome has no effect and rare variant fails", () => {
    // Using a seed where rare_variant fails (nextFloat >= 0.08)
    const rng = new SeededARERng("common-seed");
    const result = mutateMonster(baseDna, "plains", undefined, rng);

    expect(result.species).toBe("goblin");
    expect(result.resilience).toBe(0.5);
    expect(result.aggression).toBe(0.5);
    expect(result.mutations).toEqual([]);

    // Ensure it's a clone, not the same reference
    expect(result).not.toBe(baseDna);
  });

  it("increases resilience and adds frost_resistance mutation in 'snow' biome", () => {
    const rng = new SeededARERng("snow-seed");
    const result = mutateMonster(baseDna, "snow", undefined, rng);

    expect(result.resilience).toBeCloseTo(0.7); // 0.5 + 0.2
    expect(result.mutations).toContain("frost_resistance");
    expect(result.mutations.length).toBe(1);
    expect(result.aggression).toBe(0.5); // shouldn't change
  });

  it("increases aggression and adds swamp_hunger mutation in 'swamp' biome", () => {
    const rng = new SeededARERng("snow-seed"); // snow-seed gives nextFloat ~ 0.87
    const result = mutateMonster(baseDna, "swamp", undefined, rng);

    expect(result.aggression).toBeCloseTo(0.65); // 0.5 + 0.15
    expect(result.mutations).toContain("swamp_hunger");
    expect(result.mutations.length).toBe(1);
    expect(result.resilience).toBe(0.5); // shouldn't change
  });

  it("adds rare_variant mutation when rng.nextFloat() is less than 0.08", () => {
    // Seed 'swamp-seed' has nextFloat() ~ 0.018
    const rng = new SeededARERng("swamp-seed");
    const result = mutateMonster(baseDna, "plains", undefined, rng);

    expect(result.mutations).toContain("rare_variant");
    expect(result.mutations.length).toBe(1);
  });

  it("applies multiple mutations if biome and rare_variant both trigger", () => {
    const rng = new SeededARERng("swamp-seed");
    const result = mutateMonster(baseDna, "snow", undefined, rng);

    expect(result.resilience).toBeCloseTo(0.7);
    expect(result.mutations).toContain("frost_resistance");
    expect(result.mutations).toContain("rare_variant");
    expect(result.mutations.length).toBe(2);
  });
});
