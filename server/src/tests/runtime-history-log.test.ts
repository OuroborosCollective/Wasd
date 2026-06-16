import { describe, expect, it } from "vitest";
import { RuntimeHistoryLog } from "../history/RuntimeHistoryLog.js";

describe("RuntimeHistoryLog", () => {
  it("writes stable tick and hash ordered entries", () => {
    const a = new RuntimeHistoryLog();
    const b = new RuntimeHistoryLog();

    const firstA = a.write({
      tick: 12,
      source: "economy_sell",
      actorId: "player_a",
      subjectId: "village_trader_001:wood_log",
      chunkKey: "0:0",
      payload: { quantity: 2, itemId: "wood_log" },
    });
    const firstB = b.write({
      tick: 12,
      source: "economy_sell",
      actorId: "player_a",
      subjectId: "village_trader_001:wood_log",
      chunkKey: "0:0",
      payload: { itemId: "wood_log", quantity: 2 },
    });

    expect(firstA).toEqual(firstB);
    expect(firstA.sequence).toBe(0);
    expect(firstA.tick).toBe(12);
    expect(firstA.entryHash).toBeTruthy();
  });

  it("lists entries by actor without mutating stored history", () => {
    const log = new RuntimeHistoryLog();
    log.write({ tick: 1, source: "economy_sell", actorId: "player_a", subjectId: "s1", payload: { a: 1 } });
    log.write({ tick: 2, source: "trade_transfer", actorId: "player_b", subjectId: "s2", payload: { b: 2 } });

    expect(log.listByActor("player_a")).toHaveLength(1);
    expect(log.list()).toHaveLength(2);
  });
});
