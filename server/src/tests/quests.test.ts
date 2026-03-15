import { afterEach } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import { QuestRewards } from "../modules/quests/QuestRewards.js";
import { QuestStateStore } from "../modules/quests/QuestStateStore.js";

// ---------------------------------------------------------------------------
// QuestRewards
// ---------------------------------------------------------------------------
describe("QuestRewards", () => {
  let rewards: QuestRewards;

  beforeEach(() => { rewards = new QuestRewards(); });

  it("grant() adds a reward to a player that has no rewards array", () => {
    const player: any = {};
    rewards.grant(player, { type: "gold", amount: 100 });
    expect(player.rewards).toHaveLength(1);
  });

  it("grant() returns the reward object", () => {
    const reward = { type: "xp", amount: 500 };
    const result = rewards.grant({}, reward);
    expect(result).toEqual(reward);
  });

  it("grant() pushes onto an existing rewards array", () => {
    const player: any = { rewards: [{ type: "item", id: "potion" }] };
    rewards.grant(player, { type: "gold", amount: 50 });
    expect(player.rewards).toHaveLength(2);
  });

  it("grant() preserves previously granted rewards", () => {
    const player: any = {};
    rewards.grant(player, { type: "xp", amount: 100 });
    rewards.grant(player, { type: "gold", amount: 50 });
    expect(player.rewards[0]).toEqual({ type: "xp", amount: 100 });
    expect(player.rewards[1]).toEqual({ type: "gold", amount: 50 });
  });
});

// ---------------------------------------------------------------------------
// QuestStateStore
// ---------------------------------------------------------------------------
describe("QuestStateStore", () => {
  let store: QuestStateStore;

  beforeEach(() => { store = new QuestStateStore(); });

  it("list() returns empty array for unknown player", () => {
    expect(store.list("nobody")).toEqual([]);
  });

  it("add() inserts a quest for a player", () => {
    store.add("p1", { id: "find_herb", completed: false });
    expect(store.list("p1")).toHaveLength(1);
  });

  it("list() returns the correct quest", () => {
    const quest = { id: "slay_dragon", completed: false };
    store.add("p1", quest);
    expect(store.list("p1")[0]).toEqual(quest);
  });

  it("multiple quests can be added for the same player", () => {
    store.add("p1", { id: "q1" });
    store.add("p1", { id: "q2" });
    store.add("p1", { id: "q3" });
    expect(store.list("p1")).toHaveLength(3);
  });

  it("quests are isolated per player", () => {
    store.add("p1", { id: "q1" });
    store.add("p2", { id: "q2" });
    expect(store.list("p1")).toHaveLength(1);
    expect(store.list("p2")).toHaveLength(1);
    expect(store.list("p1")[0].id).toBe("q1");
  });
});

// ---------------------------------------------------------------------------
// QuestEngine
// ---------------------------------------------------------------------------
import { QuestEngine } from "../modules/quest/QuestEngine.js";
import fs from "fs";
import { vi } from "vitest";

describe("QuestEngine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles fs.existsSync throwing an error during loadData", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(fs, "existsSync").mockImplementation(() => {
      throw new Error("Disk read error");
    });

    const engine = new QuestEngine();

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toContain("Error loading Quest data:");
    expect(engine.getQuestDefinitions().size).toBe(0);
  });

  it("handles fs.readFileSync throwing an error during loadData", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("File read error");
    });

    const engine = new QuestEngine();

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toContain("Error loading Quest data:");
    expect(engine.getQuestDefinitions().size).toBe(0);
  });

  it("handles JSON.parse throwing an error during loadData", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue("invalid json {{");

    const engine = new QuestEngine();

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toContain("Error loading Quest data:");
    expect(engine.getQuestDefinitions().size).toBe(0);
  });
});
