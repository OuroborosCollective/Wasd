import { describe, it, expect, beforeEach } from "vitest";
import { FactionMemory } from "../modules/faction/FactionMemory.js";

describe("FactionMemory", () => {
  let factionMemory: FactionMemory;

  beforeEach(() => {
    factionMemory = new FactionMemory();
  });

  it("should return an empty array for a new faction using recall", () => {
    expect(factionMemory.recall("faction-1")).toEqual([]);
  });

  it("should store events with a timestamp using remember", () => {
    const event = { type: "trade", amount: 100 };
    factionMemory.remember("faction-1", event);

    const memories = factionMemory.recall("faction-1");
    expect(memories).toHaveLength(1);
    expect(memories[0]).toHaveProperty("ts");
    expect(typeof memories[0].ts).toBe("number");
    expect(memories[0].event).toEqual(event);
  });

  it("should confirm faction memories are isolated", () => {
    const event1 = { type: "attack", target: "faction-3" };
    const event2 = { type: "defend", from: "faction-4" };

    factionMemory.remember("faction-1", event1);
    factionMemory.remember("faction-2", event2);

    const memories1 = factionMemory.recall("faction-1");
    const memories2 = factionMemory.recall("faction-2");

    expect(memories1).toHaveLength(1);
    expect(memories1[0].event).toEqual(event1);

    expect(memories2).toHaveLength(1);
    expect(memories2[0].event).toEqual(event2);
  });
});
