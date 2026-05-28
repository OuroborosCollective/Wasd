import { describe, it, expect } from "vitest";
import { createARESeed, SeededARERng } from "../core/determinism/AREDeterminism.js";
import { generateMonsterDNA } from "../modules/monster/MonsterDNA.js";
import { mutateMonster } from "../modules/monster/MonsterMutation.js";
import { createMonsterSpawnSeed, MonsterSpawner, type MonsterSpawnContext } from "../modules/monster/MonsterSpawner.js";

describe("MonsterSpawner", () => {
  it("should spawn a monster with basic properties", () => {
    const spawner = new MonsterSpawner();
    const monster = spawner.spawn("Goblin", "plains");

    expect(monster).toBeDefined();
    expect(monster.species).toBe("Goblin");
    expect(typeof monster.strength).toBe("number");
    expect(typeof monster.speed).toBe("number");
    expect(typeof monster.aggression).toBe("number");
    expect(typeof monster.intelligence).toBe("number");
    expect(typeof monster.resilience).toBe("number");
    expect(Array.isArray(monster.mutations)).toBe(true);
  });

  it("should apply snow biome mutations", () => {
    const spawner = new MonsterSpawner();
    const monster = spawner.spawn("Ice Troll", "snow");

    expect(monster.mutations).toContain("frost_resistance");
  });

  it("should apply swamp biome mutations", () => {
    const spawner = new MonsterSpawner();
    const monster = spawner.spawn("Swamp Slime", "swamp");

    expect(monster.mutations).toContain("swamp_hunger");
  });

  it("generates stable DNA for the same species default seed", () => {
    expect(generateMonsterDNA("wolf")).toEqual(generateMonsterDNA("wolf"));
  });

  it("mutates monsters deterministically for the same species and biome", () => {
    const dna = generateMonsterDNA("wolf");
    expect(mutateMonster(dna, "forest")).toEqual(mutateMonster(dna, "forest"));
  });

  it("creates identical spawns for identical spatial and temporal context", () => {
    const spawner = new MonsterSpawner();
    const context: MonsterSpawnContext = {
      kappaPos: { x: 64, y: 128, z: 0 },
      tick: 120,
      packIndex: 0,
      spawnerId: "forest-pack-alpha",
    };

    expect(spawner.spawn("wolf", "forest", context)).toEqual(spawner.spawn("wolf", "forest", context));
  });

  it("varies spawns deterministically by pack index", () => {
    const spawner = new MonsterSpawner();
    const baseContext: MonsterSpawnContext = {
      kappaPos: { x: 64, y: 128, z: 0 },
      tick: 120,
      spawnerId: "forest-pack-alpha",
    };

    const first = spawner.spawn("wolf", "forest", { ...baseContext, packIndex: 0 });
    const second = spawner.spawn("wolf", "forest", { ...baseContext, packIndex: 1 });

    expect(first).not.toEqual(second);
  });

  it("varies spawns deterministically by position and tick", () => {
    const spawner = new MonsterSpawner();
    const first = spawner.spawn("wolf", "forest", {
      kappaPos: { x: 64, y: 128, z: 0 },
      tick: 120,
      packIndex: 0,
    });
    const second = spawner.spawn("wolf", "forest", {
      kappaPos: { x: 65, y: 128, z: 0 },
      tick: 121,
      packIndex: 0,
    });

    expect(first).not.toEqual(second);
  });

  it("keeps explicit RNG compatibility for legacy callers", () => {
    const spawner = new MonsterSpawner();
    const seed = createARESeed(["monster-spawn", "legacy", "wolf", "forest", "slot:0"]);

    expect(spawner.spawn("wolf", "forest", new SeededARERng(seed))).toEqual(
      spawner.spawn("wolf", "forest", new SeededARERng(seed)),
    );
  });

  it("exposes the exact seed payload helper for external spawn systems", () => {
    const context: MonsterSpawnContext = {
      kappaPos: { x: 1, y: 2, z: 3 },
      tick: 42,
      packIndex: 7,
      spawnerId: "node-a",
    };

    expect(createMonsterSpawnSeed("goblin", "forest", context)).toBe(
      createARESeed(["monster-spawn", "goblin", "forest", 1, 2, 3, 42, 7, "node-a"]),
    );
  });
});
