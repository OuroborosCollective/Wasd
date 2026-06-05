/**
 * SKILL PROGRESSION STORE UNIT TESTS
 *
 * Tests for server-authoritative skill progression store.
 * Deterministic, player-isolated.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { SkillProgressionStore } from "../skills/SkillProgressionStore.js";
import { xpForLevel, levelFromXp } from "../skills/SkillTypes.js";

describe("SkillProgressionStore", () => {
  let store: SkillProgressionStore;

  beforeEach(() => {
    store = new SkillProgressionStore();
  });

  describe("getPlayerSkillState", () => {
    it("creates default skills for new player", () => {
      const state = store.getPlayerSkillState("p1");

      expect(state.playerId).toBe("p1");
      expect(state.skills).toHaveLength(5);
      expect(state.skills.map((s) => s.id).sort()).toEqual([
        "combat",
        "crafting",
        "fishing",
        "mining",
        "woodcutting",
      ]);
    });

    it("returns level 1 with 0 XP for all skills by default", () => {
      const state = store.getPlayerSkillState("p1");

      for (const skill of state.skills) {
        expect(skill.level).toBe(1);
        expect(skill.xp).toBe(0);
      }
    });

    it("returns same state for same playerId", () => {
      const state1 = store.getPlayerSkillState("p1");
      const state2 = store.getPlayerSkillState("p1");

      expect(state1).toBe(state2);
    });
  });

  describe("applyEvent - skill_xp_gain", () => {
    it("adds XP to correct skill", () => {
      const first = store.applyEvent({
        type: "skill_xp_gain",
        playerId: "p1",
        skillId: "combat",
        amount: 100,
        source: "admin_test",
      });

      const combat = first.skills.find((s) => s.id === "combat");
      expect(combat?.xp).toBe(100);
    });

    it("accumulates XP across multiple events", () => {
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
        amount: 50,
        source: "admin_test",
      });

      const combat = second.skills.find((s) => s.id === "combat");
      expect(combat?.xp).toBe(150);
    });

    it("ignores zero or negative amounts", () => {
      const first = store.applyEvent({
        type: "skill_xp_gain",
        playerId: "p1",
        skillId: "combat",
        amount: 100,
        source: "admin_test",
      });

      store.applyEvent({
        type: "skill_xp_gain",
        playerId: "p1",
        skillId: "combat",
        amount: 0,
        source: "admin_test",
      });

      const combat = first.skills.find((s) => s.id === "combat");
      expect(combat?.xp).toBe(100);
    });

    it("only affects specified skill", () => {
      store.applyEvent({
        type: "skill_xp_gain",
        playerId: "p1",
        skillId: "combat",
        amount: 100,
        source: "admin_test",
      });

      const state = store.getPlayerSkillState("p1");
      const mining = state.skills.find((s) => s.id === "mining");

      expect(mining?.xp).toBe(0);
    });
  });

  describe("player isolation", () => {
    it("isolates player state by playerId", () => {
      store.applyEvent({
        type: "skill_xp_gain",
        playerId: "p1",
        skillId: "mining",
        amount: 100,
        source: "admin_test",
      });

      const p2 = store.getPlayerSkillState("p2");

      expect(p2.skills.find((s) => s.id === "mining")?.xp).toBe(0);
    });

    it("each player has independent XP", () => {
      store.applyEvent({
        type: "skill_xp_gain",
        playerId: "p1",
        skillId: "combat",
        amount: 500,
        source: "admin_test",
      });

      store.applyEvent({
        type: "skill_xp_gain",
        playerId: "p2",
        skillId: "combat",
        amount: 50,
        source: "admin_test",
      });

      const p1Combat = store.getPlayerSkillState("p1").skills.find((s) => s.id === "combat");
      const p2Combat = store.getPlayerSkillState("p2").skills.find((s) => s.id === "combat");

      expect(p1Combat?.xp).toBe(500);
      expect(p2Combat?.xp).toBe(50);
    });
  });

  describe("level calculation", () => {
    it("level 1 requires 100 XP", () => {
      expect(xpForLevel(1)).toBe(100);
    });

    it("level 2 requires 400 XP", () => {
      expect(xpForLevel(2)).toBe(400);
    });

    it("level 5 requires 2500 XP", () => {
      expect(xpForLevel(5)).toBe(2500);
    });

    it("0 XP gives level 1", () => {
      expect(levelFromXp(0)).toBe(1);
    });

    it("99 XP gives level 1", () => {
      expect(levelFromXp(99)).toBe(1);
    });

    it("100 XP gives level 2", () => {
      expect(levelFromXp(100)).toBe(2);
    });

    it("5000 XP gives level 7", () => {
      expect(levelFromXp(5000)).toBe(7);
    });
  });

  describe("replacePlayerSkillState", () => {
    it("replaces player state from persistence", () => {
      store.applyEvent({
        type: "skill_xp_gain",
        playerId: "p1",
        skillId: "combat",
        amount: 100,
        source: "admin_test",
      });

      store.replacePlayerSkillState("p1", {
        playerId: "p1",
        schemaVersion: 1,
        skills: store.getPlayerSkillState("p1").skills.map((s) =>
          s.id === "combat" ? { ...s, xp: 500 } : s
        ),
      });

      const combat = store.getPlayerSkillState("p1").skills.find((s) => s.id === "combat");
      expect(combat?.xp).toBe(500);
    });
  });

  describe("clearForTests", () => {
    it("clears all player state", () => {
      store.applyEvent({
        type: "skill_xp_gain",
        playerId: "p1",
        skillId: "combat",
        amount: 100,
        source: "admin_test",
      });

      store.clearForTests();

      const state = store.getPlayerSkillState("p1");
      expect(state.skills.every((s) => s.xp === 0)).toBe(true);
    });
  });
});