/**
 * Unit tests for Gameplay Snapshot determinism
 * 
 * Verifies that createGameplaySnapshot produces stable,
 * deterministic output for Quest/Guild/Faction/Map data.
 * 
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - Arrays sorted by id for determinism
 * - Empty/null states are honest and allowed
 */

import { describe, expect, it } from "vitest";
import {
  createGameplaySnapshot,
  createEmptyGameplaySnapshot,
  type QuestSnapshot,
  type GuildSnapshot,
  type FactionStandingSnapshot,
} from "../routes/gameplaySnapshotUtils.js";

describe("Gameplay snapshot determinism", () => {
  describe("createGameplaySnapshot", () => {
    it("sorts quests by id", () => {
      const quests: QuestSnapshot[] = [
        { id: "z-quest", title: "Z Quest", description: "", status: "available", objectives: [] },
        { id: "a-quest", title: "A Quest", description: "", status: "active", objectives: [] },
        { id: "m-quest", title: "M Quest", description: "", status: "completed", objectives: [] },
      ];

      const snapshot = createGameplaySnapshot({
        serverTick: 100,
        quests,
        guild: null,
        factions: [],
        map: {},
      });

      expect(snapshot.quests[0].id).toBe("a-quest");
      expect(snapshot.quests[1].id).toBe("m-quest");
      expect(snapshot.quests[2].id).toBe("z-quest");
    });

    it("sorts factions by id", () => {
      const factions: FactionStandingSnapshot[] = [
        { id: "z-faction", name: "Z Faction", standing: 10, label: "neutral" },
        { id: "a-faction", name: "A Faction", standing: 20, label: "trusted" },
        { id: "m-faction", name: "M Faction", standing: 5, label: "hostile" },
      ];

      const snapshot = createGameplaySnapshot({
        serverTick: 100,
        quests: [],
        guild: null,
        factions,
        map: {},
      });

      expect(snapshot.factions[0].id).toBe("a-faction");
      expect(snapshot.factions[1].id).toBe("m-faction");
      expect(snapshot.factions[2].id).toBe("z-faction");
    });

    it("guild defaults to null/id when not provided", () => {
      const snapshot = createGameplaySnapshot({
        serverTick: 100,
        quests: [],
        guild: undefined,
        factions: [],
        map: {},
      });

      expect(snapshot.guild.id).toBeNull();
      expect(snapshot.guild.name).toBeNull();
      expect(snapshot.guild.memberCount).toBe(0);
      expect(snapshot.guild.villageEligible).toBe(false);
    });

    it("guild null input produces null/id guild", () => {
      const snapshot = createGameplaySnapshot({
        serverTick: 100,
        quests: [],
        guild: null,
        factions: [],
        map: {},
      });

      expect(snapshot.guild.id).toBeNull();
      expect(snapshot.guild.name).toBeNull();
    });

    it("serverTick is preserved", () => {
      const snapshot = createGameplaySnapshot({
        serverTick: 999,
        quests: [],
        guild: null,
        factions: [],
        map: {},
      });

      expect(snapshot.serverTick).toBe(999);
    });

    it("status is always 'live'", () => {
      const snapshot = createGameplaySnapshot({
        serverTick: 100,
        quests: [],
        guild: null,
        factions: [],
        map: {},
      });

      expect(snapshot.status).toBe("live");
    });

    it("does not mutate input quests array", () => {
      const originalQuests: QuestSnapshot[] = [
        { id: "b-quest", title: "B", description: "", status: "active", objectives: [] },
        { id: "a-quest", title: "A", description: "", status: "available", objectives: [] },
      ];
      const originalIds = originalQuests.map((q) => q.id);

      createGameplaySnapshot({
        serverTick: 100,
        quests: originalQuests,
        guild: null,
        factions: [],
        map: {},
      });

      expect(originalQuests.map((q) => q.id)).toEqual(originalIds);
    });

    it("does not mutate input factions array", () => {
      const originalFactions: FactionStandingSnapshot[] = [
        { id: "b-fact", name: "B", standing: 10, label: "neutral" },
        { id: "a-fact", name: "A", standing: 20, label: "trusted" },
      ];
      const originalIds = originalFactions.map((f) => f.id);

      createGameplaySnapshot({
        serverTick: 100,
        quests: [],
        guild: null,
        factions: originalFactions,
        map: {},
      });

      expect(originalFactions.map((f) => f.id)).toEqual(originalIds);
    });

    it("guild with real data preserves values", () => {
      const guild: GuildSnapshot = {
        id: "guild-123",
        name: "Test Guild",
        memberCount: 42,
        rank: "officer",
        villageEligible: true,
        treasury: 1000,
      };

      const snapshot = createGameplaySnapshot({
        serverTick: 100,
        quests: [],
        guild,
        factions: [],
        map: {},
      });

      expect(snapshot.guild.id).toBe("guild-123");
      expect(snapshot.guild.name).toBe("Test Guild");
      expect(snapshot.guild.memberCount).toBe(42);
      expect(snapshot.guild.rank).toBe("officer");
      expect(snapshot.guild.villageEligible).toBe(true);
      expect(snapshot.guild.treasury).toBe(1000);
    });

    it("map defaults to unknown region", () => {
      const snapshot = createGameplaySnapshot({
        serverTick: 100,
        quests: [],
        guild: null,
        factions: [],
        map: {},
      });

      expect(snapshot.map.regionName).toBe("unknown");
      expect(snapshot.map.chunkX).toBeNull();
      expect(snapshot.map.chunkZ).toBeNull();
      expect(snapshot.map.visibleChunks).toBeNull();
      expect(snapshot.map.biome).toBeNull();
    });

    it("map with real data preserves values", () => {
      const snapshot = createGameplaySnapshot({
        serverTick: 100,
        quests: [],
        guild: null,
        factions: [],
        map: {
          regionName: "Millbrook",
          chunkX: 5,
          chunkZ: -3,
          visibleChunks: 9,
          biome: "forest",
        },
      });

      expect(snapshot.map.regionName).toBe("Millbrook");
      expect(snapshot.map.chunkX).toBe(5);
      expect(snapshot.map.chunkZ).toBe(-3);
      expect(snapshot.map.visibleChunks).toBe(9);
      expect(snapshot.map.biome).toBe("forest");
    });

    it("produces identical output for identical input", () => {
      const input = {
        serverTick: 123,
        quests: [
          { id: "q1", title: "Quest 1", description: "Desc 1", status: "active" as const, objectives: [] },
        ],
        guild: { id: "g1", name: "Guild 1", memberCount: 10, rank: "member", villageEligible: false, treasury: 100 },
        factions: [
          { id: "f1", name: "Faction 1", standing: 50, label: "neutral" as const },
        ],
        map: { regionName: "Test Region", chunkX: 1, chunkZ: 2, visibleChunks: 5, biome: "plains" },
      };

      const a = createGameplaySnapshot(input);
      const b = createGameplaySnapshot(input);

      expect(a).toEqual(b);
    });
  });

  describe("createEmptyGameplaySnapshot", () => {
    it("returns empty quests array", () => {
      const snapshot = createEmptyGameplaySnapshot(100);
      expect(snapshot.quests).toEqual([]);
    });

    it("returns null guild", () => {
      const snapshot = createEmptyGameplaySnapshot(100);
      expect(snapshot.guild.id).toBeNull();
      expect(snapshot.guild.name).toBeNull();
    });

    it("returns empty factions array", () => {
      const snapshot = createEmptyGameplaySnapshot(100);
      expect(snapshot.factions).toEqual([]);
    });

    it("returns unknown region", () => {
      const snapshot = createEmptyGameplaySnapshot(100);
      expect(snapshot.map.regionName).toBe("unknown");
    });

    it("preserves serverTick", () => {
      const snapshot = createEmptyGameplaySnapshot(999);
      expect(snapshot.serverTick).toBe(999);
    });

    it("status is 'live' (server reachable)", () => {
      const snapshot = createEmptyGameplaySnapshot(100);
      expect(snapshot.status).toBe("live");
    });
  });
});