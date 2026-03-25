import { describe, it, expect } from "vitest";
import { MonsterSpawner } from "../modules/monster/MonsterSpawner.js";

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
    // Use a fixed random seed or just let random do its thing,
    // we can't easily check random without mocking but we can check the mutation array.
    const monster = spawner.spawn("Ice Troll", "snow");

    expect(monster.mutations).toContain("frost_resistance");
  });

  it("should apply swamp biome mutations", () => {
    const spawner = new MonsterSpawner();
    const monster = spawner.spawn("Swamp Slime", "swamp");

    expect(monster.mutations).toContain("swamp_hunger");
  });
});
