import { describe, expect, it } from "vitest";
import { WarfrontSystem } from "../modules/warfront/WarfrontSystem.js";

function mkPlayer(id: string) {
  return {
    id,
    gold: 0,
    xp: 0,
    warfrontProgress: {
      seasonId: "",
      seasonPoints: 0,
      lifetimeContribution: 0,
      claimedTierIds: [],
      lastCycle: null,
      rewardHistory: [],
    },
  };
}

describe("WarfrontSystem", () => {
  it("promotes cycle to boss_ready when all sector targets are filled", () => {
    const sys = new WarfrontSystem();
    const now = new Date("2026-04-26T10:00:00.000Z").getTime();
    const player = mkPlayer("p1");
    const cycle = sys.getCycleSnapshot(now);
    const combat = cycle.sectors.find((s) => s.kind === "combat");
    const crafting = cycle.sectors.find((s) => s.kind === "crafting");
    const scouting = cycle.sectors.find((s) => s.kind === "scouting");
    expect(combat && crafting && scouting).toBeTruthy();

    const r1 = sys.registerContribution(player, "combat", combat!.targetPoints, now);
    const r2 = sys.registerContribution(player, "crafting", crafting!.targetPoints, now);
    const r3 = sys.registerContribution(player, "scouting", scouting!.targetPoints, now);

    expect(r1.accepted).toBe(true);
    expect(r2.accepted).toBe(true);
    expect(r3.accepted).toBe(true);
    expect(r3.becameBossReady).toBe(true);
    expect(sys.canSpawnFrontBoss(now).ok).toBe(true);
    expect(sys.getCycleSnapshot(now).phase).toBe("boss_ready");
  });

  it("claims season reward tiers exactly once", () => {
    const sys = new WarfrontSystem();
    const now = new Date("2026-04-26T10:00:00.000Z").getTime();
    const player = mkPlayer("p2");

    sys.registerContribution(player, "combat", 400, now);
    sys.registerContribution(player, "crafting", 180, now);
    sys.registerContribution(player, "scouting", 160, now);

    const firstClaim = sys.claimSeasonRewards(player, now);
    expect(firstClaim.ok).toBe(true);
    expect((firstClaim.totalGold ?? 0) > 0).toBe(true);
    expect((firstClaim.totalXp ?? 0) > 0).toBe(true);
    expect((firstClaim.claimedTierIds ?? []).length).toBeGreaterThan(0);

    const secondClaim = sys.claimSeasonRewards(player, now + 1_000);
    expect(secondClaim.ok).toBe(false);
    expect(secondClaim.reason).toMatch(/No Warfront rewards ready/i);
  });

  it("rotates cycle at day boundary and resets phase", () => {
    const sys = new WarfrontSystem();
    const start = new Date("2026-04-26T10:00:00.000Z").getTime();
    const before = sys.getCycleSnapshot(start);
    const rotated = sys.tick(before.endsAt + 1);
    const after = sys.getCycleSnapshot(before.endsAt + 1);

    expect(rotated.rotated).toBe(true);
    expect(after.cycleId).not.toBe(before.cycleId);
    expect(after.phase).toBe("building");
  });
});
