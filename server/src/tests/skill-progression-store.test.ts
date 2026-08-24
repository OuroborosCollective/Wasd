import { beforeEach, describe, expect, it } from "vitest";
import { SkillProgressionStore } from "../skills/SkillProgressionStore.js";
import {
  levelFromXp,
  normalizeSkillSnapshot,
  xpForLevel,
  xpForLevelExact,
} from "../skills/SkillTypes.js";

describe("SkillProgressionStore", () => {
  let store: SkillProgressionStore;

  beforeEach(() => {
    store = new SkillProgressionStore();
  });

  it("creates schema-2 exact defaults for a new player", () => {
    const state = store.getPlayerSkillState("p1");
    expect(state.playerId).toBe("p1");
    expect(state.schemaVersion).toBe(2);
    expect(state.skills).toHaveLength(5);
    expect(state.skills.map((skill) => skill.id)).toEqual([
      "combat",
      "crafting",
      "fishing",
      "mining",
      "woodcutting",
    ]);
    for (const skill of state.skills) {
      expect(skill.level).toBe(1);
      expect(skill.levelExact).toBe("1");
      expect(skill.xp).toBe(0);
      expect(skill.xpExact).toBe("0");
      expect(skill.xpIntoLevelExact).toBe("0");
      expect(skill.numberProjectionExact).toBe(true);
    }
  });

  it("accumulates XP through exact progression state", () => {
    store.applyEvent({
      type: "skill_xp_gain",
      playerId: "p1",
      skillId: "combat",
      amount: 100,
      source: "admin_test",
    });
    const second = store.applyEvent({
      type: "skill_xp_gain",
      playerId: "p1",
      skillId: "combat",
      amount: 101,
      source: "admin_test",
    });
    const combat = second.skills.find((skill) => skill.id === "combat")!;

    expect(combat.xpExact).toBe("201");
    expect(combat.levelExact).toBe("3");
    expect(combat.xpIntoLevelExact).toBe("20");
  });

  it("ignores zero, negative, fractional, and unsafe XP events", () => {
    const invalidAmounts = [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1];
    for (const amount of invalidAmounts) {
      store.applyEvent({
        type: "skill_xp_gain",
        playerId: "p1",
        skillId: "combat",
        amount,
        source: "admin_test",
      });
    }
    expect(store.getPlayerSkillState("p1").skills.find((skill) => skill.id === "combat")?.xpExact).toBe("0");
  });

  it("isolates players and skills", () => {
    store.applyEvent({
      type: "skill_xp_gain",
      playerId: "p1",
      skillId: "mining",
      amount: 100,
      source: "admin_test",
    });
    expect(store.getPlayerSkillState("p1").skills.find((skill) => skill.id === "mining")?.xpExact).toBe("100");
    expect(store.getPlayerSkillState("p1").skills.find((skill) => skill.id === "combat")?.xpExact).toBe("0");
    expect(store.getPlayerSkillState("p2").skills.find((skill) => skill.id === "mining")?.xpExact).toBe("0");
  });

  it("uses the canonical historical Arelorian XP curve", () => {
    expect(xpForLevel(1)).toBe(50);
    expect(xpForLevel(2)).toBe(131);
    expect(xpForLevel(3)).toBe(232);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(180)).toBe(2);
    expect(levelFromXp(181)).toBe(3);
  });

  it("migrates schema-1 number-only state", () => {
    store.replacePlayerSkillState("p1", {
      playerId: "p1",
      schemaVersion: 1,
      skills: [
        {
          id: "combat",
          title: "Combat",
          level: 3,
          xp: 201,
          xpForNextLevel: 0,
          progressRatio: 0,
        },
      ],
    });

    const combat = store.getPlayerSkillState("p1").skills.find((skill) => skill.id === "combat")!;
    expect(combat.levelExact).toBe("3");
    expect(combat.xpExact).toBe("201");
    expect(combat.xpIntoLevelExact).toBe("20");
  });

  it("has no level-99 cap", () => {
    const combat = normalizeSkillSnapshot({
      id: "combat",
      xp: 0,
      xpExact: "1000000000",
      levelExact: "99",
      xpIntoLevelExact: "0",
    });
    store.replacePlayerSkillState("p1", {
      playerId: "p1",
      schemaVersion: 2,
      skills: [combat],
    });

    store.applyEvent({
      type: "skill_xp_gain",
      playerId: "p1",
      skillId: "combat",
      amount: Number(xpForLevelExact(99)),
      source: "admin_test",
    });

    expect(store.getPlayerSkillState("p1").skills.find((skill) => skill.id === "combat")?.levelExact).toBe("100");
  });

  it("has no former 999999 safety ceiling", () => {
    const combat = normalizeSkillSnapshot({
      id: "combat",
      xp: 0,
      xpExact: "999999999999999999",
      levelExact: "999999",
      xpIntoLevelExact: "0",
    });
    store.replacePlayerSkillState("p1", {
      playerId: "p1",
      schemaVersion: 2,
      skills: [combat],
    });

    store.applyEvent({
      type: "skill_xp_gain",
      playerId: "p1",
      skillId: "combat",
      amount: Number(xpForLevelExact(999999)),
      source: "admin_test",
    });

    expect(store.getPlayerSkillState("p1").skills.find((skill) => skill.id === "combat")?.levelExact).toBe("1000000");
  });

  it("clears all player state for tests", () => {
    store.applyEvent({
      type: "skill_xp_gain",
      playerId: "p1",
      skillId: "combat",
      amount: 100,
      source: "admin_test",
    });
    store.clearForTests();
    expect(store.getPlayerSkillState("p1").skills.every((skill) => skill.xpExact === "0")).toBe(true);
  });
});
