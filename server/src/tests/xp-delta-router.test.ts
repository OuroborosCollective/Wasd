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

  it("sorts deltas deterministically by tick, player, skill, and sourceId", () => {
    const router = new XPDeltaRouter();
    router.enqueueMany([
      { kind: "xp_delta", source: "combat_delta", tick: 10, playerId: "playerB", skillId: "woodcutting", amount: 5 },
      { kind: "xp_delta", source: "combat_delta", tick: 5, playerId: "playerB", skillId: "mining", amount: 5 },
      { kind: "xp_delta", source: "combat_delta", tick: 5, playerId: "playerA", skillId: "swordsmanship", amount: 10 },
      { kind: "xp_delta", source: "combat_delta", tick: 5, playerId: "playerA", skillId: "archery", amount: 10, sourceId: "src2" },
      { kind: "xp_delta", source: "combat_delta", tick: 5, playerId: "playerA", skillId: "archery", amount: 10, sourceId: "src1" },
    ]);

    const drained = router.drainThroughTick(10);
    expect(drained.map((d) => `${d.tick}-${d.playerId}-${d.skillId}-${d.sourceId ?? ""}`)).toEqual([
      "5-playerA-archery-src1",
      "5-playerA-archery-src2",
      "5-playerA-swordsmanship-",
      "5-playerB-mining-",
      "10-playerB-woodcutting-",
    ]);
  });

  it("benchmarks sorting performance", () => {
    const router = new XPDeltaRouter();
    const count = 20000;
    const skills = ["combat", "mining", "woodcutting", "crafting", "alchemy"];
    for (let i = 0; i < count; i++) {
      router.enqueue({
        kind: "xp_delta",
        source: "combat_delta",
        tick: (i * 37) % 100,
        playerId: `player_${i % 100}`,
        skillId: skills[i % skills.length],
        amount: (i % 50) + 1,
        sourceId: `source_${i % 10}`,
      });
    }

    const start = performance.now();
    const drained = router.drainThroughTick(100);
    const duration = performance.now() - start;

    expect(drained).toHaveLength(count);
    console.log(`[XPDeltaRouter Benchmark] Sorted ${count} XP deltas in ${duration.toFixed(2)}ms`);
  });
});
