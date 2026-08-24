import { describe, expect, it } from "vitest";
import { PlayerStatsDirector, xpForLevelExact } from "./PlayerStatsDirector.js";

describe("PlayerStatsDirector exact endless progression", () => {
  it("levels with the canonical curve and awards stat points", () => {
    const stats = new PlayerStatsDirector();
    const result = stats.applyXP("p1", "combat", 50);

    expect(result.accepted).toBe(true);
    expect(result.oldLevelExact).toBe("1");
    expect(result.newLevelExact).toBe("2");
    expect(result.levelsGainedExact).toBe("1");
    expect(stats.getUnspentPoints("p1")).toBe(5);
  });

  it("migrates legacy number-only skill state", () => {
    const stats = new PlayerStatsDirector();
    stats.loadSkills("p1", { combat: { xp: 201, level: 3 } });
    const saved = stats.getSkillsForSave("p1")!;

    expect(saved.combat.xpExact).toBe("201");
    expect(saved.combat.levelExact).toBe("3");
    expect(saved.combat.xpIntoLevelExact).toBe("20");
  });

  it("advances beyond the former 999999 ceiling", () => {
    const stats = new PlayerStatsDirector();
    stats.loadSkills("p1", {
      combat: {
        xp: Number.MAX_SAFE_INTEGER,
        level: 999999,
        xpExact: "999999999999999999",
        levelExact: "999999",
        xpIntoLevelExact: "0",
      },
    });

    const result = stats.applyXP("p1", "combat", Number(xpForLevelExact(999999)));
    expect(result.newLevelExact).toBe("1000000");
  });

  it("keeps XP application chunking-invariant", () => {
    const oneBatch = new PlayerStatsDirector();
    const chunked = new PlayerStatsDirector();

    oneBatch.applyXP("p1", "combat", 1000);
    chunked.applyXP("p1", "combat", 400);
    chunked.applyXP("p1", "combat", 600);

    expect(chunked.getSkillsForSave("p1")?.combat).toEqual(oneBatch.getSkillsForSave("p1")?.combat);
  });

  it("exposes exact total level in snapshots", () => {
    const stats = new PlayerStatsDirector();
    const snapshot = stats.getFullSnapshot("p1");
    expect(snapshot.totalLevelExact).toBe(String(Object.keys(snapshot.skills).length));
  });
});
