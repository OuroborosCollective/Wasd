import { describe, it, expect } from "vitest";
import { MonsterSpawner } from "../modules/monster/MonsterSpawner.js";
import { SeededARERng } from "../core/determinism/AREDeterminism.js";

describe("Monster Spawning Determinism", () => {
  it("should produce identical monsters given the same seed", () => {
    const spawner = new MonsterSpawner();
    const seed = "test-seed-123";

    const rng1 = new SeededARERng(seed);
    const monster1 = spawner.spawn("Orc", "snow", rng1);

    const rng2 = new SeededARERng(seed);
    const monster2 = spawner.spawn("Orc", "snow", rng2);

    expect(monster1).toEqual(monster2);
    expect(monster1.strength).toBe(monster2.strength);
    expect(monster1.mutations).toEqual(monster2.mutations);
  });

  it("should produce different monsters given different seeds", () => {
    const spawner = new MonsterSpawner();

    const rng1 = new SeededARERng("seed-a");
    const monster1 = spawner.spawn("Orc", "snow", rng1);

    const rng2 = new SeededARERng("seed-b");
    const monster2 = spawner.spawn("Orc", "snow", rng2);

    expect(monster1).not.toEqual(monster2);
  });

  it("should be deterministic without explicit RNG (using species-based default)", () => {
    const spawner = new MonsterSpawner();

    // Default RNG in DNA/Mutation uses "monster-dna"|species and "monster-mutation"|species|biome
    const monster1 = spawner.spawn("Goblin", "plains");
    const monster2 = spawner.spawn("Goblin", "plains");

    expect(monster1).toEqual(monster2);
  });
});
