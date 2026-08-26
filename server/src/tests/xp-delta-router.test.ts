import { describe, expect, it } from "vitest";
import { XPDeltaRouter } from "../modules/player/XPDeltaRouter.js";

describe("XPDeltaRouter", () => {
  it("accepts valid xp deltas and drains them by tick", () => {
    const router = new XPDeltaRouter();
    expect(router.enqueue({
      kind: "xp_delta",
      source: "combat_delta",
      tick: 5,
      playerId: "p1",
      skillId: "combat",
      amount: 10,
    })).toBe(true);
    expect(router.drainThroughTick(4)).toEqual([]);
    expect(router.drainThroughTick(5)).toHaveLength(1);
  });

  it("rejects invalid or non-integer xp deltas without throwing", () => {
    const router = new XPDeltaRouter();
    expect(router.enqueue({
      kind: "xp_delta",
      source: "combat_delta",
      tick: 1,
      playerId: "",
      skillId: "combat",
      amount: 10,
    })).toBe(false);
    expect(router.enqueue({
      kind: "xp_delta",
      source: "combat_delta",
      tick: 1,
      playerId: "p1",
      skillId: "combat",
      amount: 1.5,
    })).toBe(false);
    expect(router.snapshot().count).toBe(0);
  });

  it("uses stable binary ordering for same-tick deltas", () => {
    const router = new XPDeltaRouter();
    for (const playerId of ["ä", "a", "Z", "2", "10"]) {
      router.enqueue({
        kind: "xp_delta",
        source: "combat_delta",
        tick: 9,
        playerId,
        skillId: "combat",
        amount: 1,
      });
    }
    expect(router.drainThroughTick(9).map((delta) => delta.playerId))
      .toEqual(["10", "2", "Z", "a", "ä"]);
  });
});
