/**
 * SKILL PERSISTENCE TESTS
 *
 * Tests for JSON skill persistence adapter.
 * Deterministic, atomic writes.
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { JsonSkillPersistenceAdapter } from "../skills/JsonSkillPersistenceAdapter.js";
import type { PersistedPlayerSkillState } from "../skills/SkillPersistence.js";

describe("JsonSkillPersistenceAdapter", () => {
  const testFilePath = "/tmp/test-skill-state.json";
  let adapter: JsonSkillPersistenceAdapter;

  beforeEach(() => {
    // Clean up any existing test file
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
    adapter = new JsonSkillPersistenceAdapter(testFilePath);
  });

  afterEach(() => {
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  describe("loadPlayerSkillState", () => {
    it("returns null for new player", async () => {
      const result = await adapter.loadPlayerSkillState("new-player");
      expect(result).toBeNull();
    });

    it("loads saved state", async () => {
      const state: PersistedPlayerSkillState = {
        playerId: "p1",
        schemaVersion: 1,
        skills: [
          {
            id: "combat",
            title: "Combat",
            level: 2,
            xp: 150,
            xpForNextLevel: 400,
            progressRatio: 0.125,
          },
        ],
      };

      await adapter.savePlayerSkillState(state);
      const loaded = await adapter.loadPlayerSkillState("p1");

      expect(loaded).not.toBeNull();
      expect(loaded?.playerId).toBe("p1");
      expect(loaded?.skills).toHaveLength(1);
    });
  });

  describe("savePlayerSkillState", () => {
    it("saves state and can be loaded", async () => {
      const state: PersistedPlayerSkillState = {
        playerId: "p1",
        schemaVersion: 1,
        skills: [
          {
            id: "combat",
            title: "Combat",
            level: 1,
            xp: 0,
            xpForNextLevel: 100,
            progressRatio: 0,
          },
        ],
      };

      await adapter.savePlayerSkillState(state);
      const loaded = await adapter.loadPlayerSkillState("p1");

      expect(loaded?.skills[0].xp).toBe(0);
    });

    it("overwrites existing player state", async () => {
      const state1: PersistedPlayerSkillState = {
        playerId: "p1",
        schemaVersion: 1,
        skills: [
          {
            id: "combat",
            title: "Combat",
            level: 1,
            xp: 0,
            xpForNextLevel: 100,
            progressRatio: 0,
          },
        ],
      };

      await adapter.savePlayerSkillState(state1);

      const state2: PersistedPlayerSkillState = {
        ...state1,
        skills: state1.skills.map((s) => ({ ...s, xp: 500 })),
      };

      await adapter.savePlayerSkillState(state2);
      const loaded = await adapter.loadPlayerSkillState("p1");

      expect(loaded?.skills[0].xp).toBe(500);
    });

    it("only affects the specified player", async () => {
      const p1State: PersistedPlayerSkillState = {
        playerId: "p1",
        schemaVersion: 1,
        skills: [
          {
            id: "combat",
            title: "Combat",
            level: 1,
            xp: 100,
            xpForNextLevel: 400,
            progressRatio: 0,
          },
        ],
      };

      const p2State: PersistedPlayerSkillState = {
        playerId: "p2",
        schemaVersion: 1,
        skills: [
          {
            id: "combat",
            title: "Combat",
            level: 1,
            xp: 50,
            xpForNextLevel: 400,
            progressRatio: 0,
          },
        ],
      };

      await adapter.savePlayerSkillState(p1State);
      await adapter.savePlayerSkillState(p2State);

      const loaded1 = await adapter.loadPlayerSkillState("p1");
      const loaded2 = await adapter.loadPlayerSkillState("p2");

      expect(loaded1?.skills[0].xp).toBe(100);
      expect(loaded2?.skills[0].xp).toBe(50);
    });
  });

  describe("health", () => {
    it("returns ok for writable directory", async () => {
      const result = await adapter.health();
      expect(result.ok).toBe(true);
      expect(result.driver).toBe("json");
    });

    it("returns error for non-writable path", async () => {
      const badAdapter = new JsonSkillPersistenceAdapter("/root/cant-write.json");
      const result = await badAdapter.health();
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});