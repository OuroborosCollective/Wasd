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

  it("rejects invalid xp deltas without throwing", () => {
    const router = new XPDeltaRouter();

    expect(router.enqueue({
      kind: "xp_delta",
      source: "combat_delta",
      tick: 1,
      playerId: "",
      skillId: "combat",
      amount: 10,
    })).toBe(false);

    expect(router.snapshot().count).toBe(0);
  });
});
