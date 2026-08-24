import { describe, expect, it } from "vitest";
import { toLiveSkillStateFromLegacy } from "../LegacySkillSnapshotAdapter.js";

describe("LegacySkillSnapshotAdapter", () => {
  it("preserves canonical exact endless progression fields", () => {
    const projected = toLiveSkillStateFromLegacy({
      id: "combat",
      xp: Number.MAX_SAFE_INTEGER,
      level: Number.MAX_SAFE_INTEGER,
      xpExact: "900719925474099200000000000000",
      levelExact: "1000000000000000001",
      xpIntoLevelExact: "42",
      xpForNextLevelExact: "999999999999999999999",
      numberProjectionExact: false,
    });

    expect(projected.skillId).toBe("combat");
    expect(projected.xpExact).toBe("900719925474099200000000000000");
    expect(projected.levelExact).toBe("1000000000000000001");
    expect(projected.xpIntoLevelExact).toBe("42");
    expect(projected.xpForNextLevelExact).toBe("999999999999999999999");
    expect(projected.numberProjectionExact).toBe(false);
  });

  it("omits malformed exact fields instead of asserting them as truth", () => {
    const projected = toLiveSkillStateFromLegacy({
      skillId: "mining",
      xp: 20,
      level: 2,
      xpExact: "020",
      levelExact: "0",
      xpIntoLevelExact: "-1",
      xpForNextLevelExact: "1.5",
    });

    expect(projected).toMatchObject({ skillId: "mining", xp: 20, level: 2 });
    expect(projected).not.toHaveProperty("xpExact");
    expect(projected).not.toHaveProperty("levelExact");
    expect(projected).not.toHaveProperty("xpIntoLevelExact");
    expect(projected).not.toHaveProperty("xpForNextLevelExact");
  });

  it("keeps legacy Number projections bounded at their existing compatibility floor", () => {
    expect(toLiveSkillStateFromLegacy({ id: "combat", xp: -5, level: 0 }))
      .toMatchObject({ skillId: "combat", xp: 0, level: 1 });
  });
});
