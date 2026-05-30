import { describe, it, expect, beforeEach } from "vitest";
import { mutateMonster } from "../../../modules/monster/MonsterMutation.js";
import { SeededARERng } from "../../../core/determinism/AREDeterminism.js";

describe("MonsterMutation", () => {
  const baseDna = {
    species: "goblin",
    resilience: 0.5,
    aggression: 0.5,
    strength: 0.5,
    speed: 0.5,
    intelligence: 0.5,
  };

  it("returns a clone with empty mutations array when biome has no effect and rare variant fails", () => {
    // nextFloat("seed0") is ~0.16
    const rng = new SeededARERng("seed0");
    const result = mutateMonster(baseDna, "plains", rng);

    expect(result.species).toBe("goblin");
    expect(result.resilience).toBe(0.5);
    expect(result.aggression).toBe(0.5);
    expect(result.mutations).toEqual([]);

    // Ensure it's a clone, not the same reference
    expect(result).not.toBe(baseDna);
  });

  it("increases resilience and adds frost_resistance mutation in 'snow' biome", () => {
    const rng = new SeededARERng("seed0");
    const result = mutateMonster(baseDna, "snow", rng);

    expect(result.resilience).toBeCloseTo(0.7); // 0.5 + 0.2
    expect(result.mutations).toContain("frost_resistance");
    expect(result.aggression).toBe(0.5);
  });

  it("increases aggression and adds swamp_hunger mutation in 'swamp' biome", () => {
    const rng = new SeededARERng("seed0");
    const result = mutateMonster(baseDna, "swamp", rng);

    expect(result.aggression).toBeCloseTo(0.65); // 0.5 + 0.15
    expect(result.mutations).toContain("swamp_hunger");
    expect(result.resilience).toBe(0.5);
  });

  it("adds rare_variant mutation when rng.nextFloat() is less than 0.08", () => {
    // nextFloat("seed13") is ~0.013
    const rng = new SeededARERng("seed13");
    const result = mutateMonster(baseDna, "plains", rng);

    expect(result.mutations).toContain("rare_variant");
  });

  it("applies weather modifiers when weather is provided", () => {
    const rng = new SeededARERng("seed0");
    const result = mutateMonster(baseDna, "plains", rng, "storm");

    expect(result.mutations).toContain("storm_frenzy");
    expect(result.aggression).toBeGreaterThan(0.5);
  });
});
