import { describe, it, expect } from "vitest";
import { SeededARERng, createARESeed } from "../../../core/determinism/AREDeterminism.js";
import { MonsterSpawner, type MonsterSpawnContext } from "../../../modules/monster/MonsterSpawner.js";

describe("MonsterSpawner", () => {
  it("spawns a monster with the given species and deterministic base stats", () => {
    const spawner = new MonsterSpawner();
    const seed = createARESeed(["monster-test", "goblin", "plains", "base"]);

    const monster = spawner.spawn("goblin", "plains", new SeededARERng(seed));
    const again = spawner.spawn("goblin", "plains", new SeededARERng(seed));

    expect(monster).toEqual(again);
    expect(monster.species).toBe("goblin");
    expect(typeof monster.strength).toBe("number");
    expect(typeof monster.speed).toBe("number");
    expect(typeof monster.aggression).toBe("number");
    expect(typeof monster.intelligence).toBe("number");
    expect(typeof monster.resilience).toBe("number");
  });

  it("applies 'snow' biome mutations correctly", () => {
    const spawner = new MonsterSpawner();
    const monster = spawner.spawn("yeti", "snow", new SeededARERng(createARESeed(["monster-test", "snow"])));

    expect(monster.resilience).toBeGreaterThanOrEqual(0.2);
    expect(monster.mutations).toContain("frost_resistance");
  });

  it("applies 'swamp' biome mutations correctly", () => {
    const spawner = new MonsterSpawner();
    const monster = spawner.spawn("troll", "swamp", new SeededARERng(createARESeed(["monster-test", "swamp"])));

    expect(monster.aggression).toBeGreaterThanOrEqual(0.15);
    expect(monster.mutations).toContain("swamp_hunger");
  });

  it("keeps identical context spawns stable", () => {
    const spawner = new MonsterSpawner();
    const context: MonsterSpawnContext = {
      kappaPos: { x: 5, y: 9, z: 0 },
      tick: 77,
      packIndex: 0,
      spawnerId: "test-node",
    };

    expect(spawner.spawn("dragon", "mountains", context)).toEqual(spawner.spawn("dragon", "mountains", context));
  });

  it("changes output when deterministic context changes", () => {
    const spawner = new MonsterSpawner();
    const first = spawner.spawn("dragon", "mountains", {
      kappaPos: { x: 5, y: 9, z: 0 },
      tick: 77,
      packIndex: 0,
      spawnerId: "test-node",
    });
    const second = spawner.spawn("dragon", "mountains", {
      kappaPos: { x: 5, y: 9, z: 0 },
      tick: 77,
      packIndex: 1,
      spawnerId: "test-node",
    });

    expect(first).not.toEqual(second);
  });
});
