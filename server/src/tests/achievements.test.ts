import { describe, it, expect, beforeEach } from "vitest";
import { AchievementSystem } from "../modules/achievements/AchievementSystem.js";
import { AchievementRegistry } from "../modules/achievements/AchievementRegistry.js";

// ---------------------------------------------------------------------------
// AchievementSystem
// ---------------------------------------------------------------------------
describe("AchievementSystem", () => {
  let system: AchievementSystem;

  beforeEach(() => { system = new AchievementSystem(); });

  it("new player has no achievements", () => {
    expect(system.list("player1")).toHaveLength(0);
  });

  it("unlock() grants an achievement and returns its id", () => {
    const id = system.unlock("player1", "first_blood");
    expect(id).toBe("first_blood");
  });

  it("list() returns the unlocked achievement", () => {
    system.unlock("player1", "first_blood");
    expect(system.list("player1")).toContain("first_blood");
  });

  it("unlocking the same achievement twice does not duplicate it", () => {
    system.unlock("player1", "ruin_discoverer");
    system.unlock("player1", "ruin_discoverer");
    const list = system.list("player1");
    const count = list.filter((a) => a === "ruin_discoverer").length;
    expect(count).toBe(1);
  });

  it("achievements are tracked per player", () => {
    system.unlock("player1", "first_blood");
    system.unlock("player2", "master_smith");
    expect(system.list("player1")).toContain("first_blood");
    expect(system.list("player1")).not.toContain("master_smith");
    expect(system.list("player2")).toContain("master_smith");
  });

  it("list() returns an array (not a Set)", () => {
    system.unlock("player1", "first_blood");
    expect(Array.isArray(system.list("player1"))).toBe(true);
  });

  it("player with no unlocks returns empty array even if other players have unlocks", () => {
    system.unlock("player1", "first_blood");
    expect(system.list("unknown_player")).toHaveLength(0);
  });

  it("multiple achievements can be unlocked for a single player", () => {
    system.unlock("p1", "first_blood");
    system.unlock("p1", "ruin_discoverer");
    system.unlock("p1", "master_smith");
    expect(system.list("p1")).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// AchievementRegistry
// ---------------------------------------------------------------------------
describe("AchievementRegistry", () => {
  it("first_blood is in the combat category", () => {
    expect(AchievementRegistry.first_blood.category).toBe("combat");
  });

  it("ruin_discoverer is in the exploration category", () => {
    expect(AchievementRegistry.ruin_discoverer.category).toBe("exploration");
  });

  it("master_smith is in the crafting category", () => {
    expect(AchievementRegistry.master_smith.category).toBe("crafting");
  });

  it("all entries have an id and category", () => {
    for (const entry of Object.values(AchievementRegistry)) {
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("category");
    }
  });
});
