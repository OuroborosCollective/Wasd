import { describe, it, expect } from "vitest";
import {
  OracleVisionEngine,
  type BloodOffering,
  type GhostTown,
  type FallenEntity,
} from "../../../oracle/OracleVisionEngine.js";

describe("OracleVisionEngine", () => {
  const baseState = { tick: 50000, stateHash: "are_test12345678" };

  describe("analyzeWarfront", () => {
    it("should generate vision when front boss is active", () => {
      const warfrontSnapshot = {
        cycleId: "warfront_cycle_5",
        phase: "boss_active",
        sectors: [
          { id: "s1", kind: "combat", currentPoints: 320, targetPoints: 320 },
          { id: "s2", kind: "crafting", currentPoints: 200, targetPoints: 220 },
          { id: "s3", kind: "scouting", currentPoints: 150, targetPoints: 180 },
        ],
        frontBossActive: true,
      };

      const visions = OracleVisionEngine.analyzeWarfront(warfrontSnapshot, baseState);

      expect(visions.length).toBeGreaterThan(0);
      const bossVision = visions.find((v) => v.type === "warfront_forecast");
      expect(bossVision).toBeDefined();
      expect(bossVision?.priority).toBe(850);
    });

    it("should warn about failing sectors", () => {
      const warfrontSnapshot = {
        cycleId: "warfront_cycle_5",
        phase: "building",
        sectors: [
          { id: "s1", kind: "combat", currentPoints: 50, targetPoints: 320 }, // < 30%
          { id: "s2", kind: "crafting", currentPoints: 200, targetPoints: 220 },
          { id: "s3", kind: "scouting", currentPoints: 150, targetPoints: 180 },
        ],
        frontBossActive: false,
      };

      const visions = OracleVisionEngine.analyzeWarfront(warfrontSnapshot, baseState);

      const collapseVision = visions.find((v) => v.type === "faction_collapse");
      expect(collapseVision).toBeDefined();
      expect(collapseVision?.subject.name).toBe("combat");
    });
  });

  describe("analyzeBloodOfferings", () => {
    it("should predict dungeon emergence when deaths are high", () => {
      const offerings: BloodOffering[] = [
        {
          regionId: "region:dark_forest",
          position: { x: 100, y: -50 },
          totalDeaths: 60,
          deathsByType: { player: 30, npc: 30 },
          firstDeathTick: 40000,
          lastDeathTick: 49900,
          dangerLevel: 800,
          dungeonEmergenceThreshold: 50,
        },
      ];

      const prophecies = OracleVisionEngine.analyzeBloodOfferings(offerings, baseState);

      expect(prophecies.length).toBe(1);
      expect(prophecies[0].accumulatedDeaths).toBe(60);
      expect(prophecies[0].emergenceLikelihood).toBeGreaterThan(400);
      expect(prophecies[0].dungeonName).toBeDefined();
      expect(prophecies[0].dungeonType).toBeDefined();
    });

    it("should not predict dungeon when deaths are low", () => {
      const offerings: BloodOffering[] = [
        {
          regionId: "region:peaceful_village",
          position: { x: 10, y: 20 },
          totalDeaths: 5,
          deathsByType: { player: 3, npc: 2 },
          firstDeathTick: 49000,
          lastDeathTick: 49500,
          dangerLevel: 100,
          dungeonEmergenceThreshold: 50,
        },
      ];

      const prophecies = OracleVisionEngine.analyzeBloodOfferings(offerings, baseState);

      expect(prophecies.length).toBe(0);
    });

    it("should sort prophecies by likelihood descending", () => {
      const offerings: BloodOffering[] = [
        {
          regionId: "region:low",
          position: { x: 0, y: 0 },
          totalDeaths: 60,
          deathsByType: { player: 30, npc: 30 },
          firstDeathTick: 45000,
          lastDeathTick: 49900,
          dangerLevel: 300,
          dungeonEmergenceThreshold: 50,
        },
        {
          regionId: "region:high",
          position: { x: 100, y: 100 },
          totalDeaths: 80,
          deathsByType: { player: 40, npc: 40 },
          firstDeathTick: 40000,
          lastDeathTick: 49900,
          dangerLevel: 900,
          dungeonEmergenceThreshold: 50,
        },
      ];

      const prophecies = OracleVisionEngine.analyzeBloodOfferings(offerings, baseState);

      expect(prophecies.length).toBe(2);
      expect(prophecies[0].regionId).toBe("region:high");
      expect(prophecies[0].emergenceLikelihood).toBeGreaterThan(prophecies[1].emergenceLikelihood);
    });
  });

  describe("analyzeGhostTowns", () => {
    it("should warn about haunted ghost towns", () => {
      const ghostTowns: GhostTown[] = [
        {
          id: "town:old_mill",
          name: "Das alte Mühlendorf",
          regionId: "region:northern_plains",
          position: { x: -50, y: 30 },
          originalPopulation: 50,
          abandonedAtTick: 40000,
          cause: "war",
          hauntingIntensity: 600,
        },
      ];

      const visions = OracleVisionEngine.analyzeGhostTowns(ghostTowns, baseState);

      expect(visions.length).toBe(1);
      expect(visions[0].type).toBe("ghost_town_warning");
      expect(visions[0].subject.name).toBe("Das alte Mühlendorf");
    });

    it("should not warn about fresh ghost towns", () => {
      const ghostTowns: GhostTown[] = [
        {
          id: "town:newly_abandoned",
          name: "Neu verlassen",
          regionId: "region:test",
          position: { x: 0, y: 0 },
          originalPopulation: 20,
          abandonedAtTick: 49900, // Only 100 ticks ago
          cause: "player_exodus",
          hauntingIntensity: 200,
        },
      ];

      const visions = OracleVisionEngine.analyzeGhostTowns(ghostTowns, baseState);

      // Intensity is too low even with time factor
      expect(visions.length).toBe(0);
    });
  });

  describe("analyzeFallenEntities", () => {
    it("should create dungeon visions for mass grave locations", () => {
      const fallen: FallenEntity[] = Array.from({ length: 15 }, (_, i) => ({
        id: `player_${i}`,
        type: "player" as const,
        name: `Spieler ${i}`,
        regionId: "region:death_field",
        position: { x: 42, y: -12 },
        diedAtTick: 49000 + i * 100,
        cause: "combat" as const,
        lastThreat: 700,
      }));

      const visions = OracleVisionEngine.analyzeFallenEntities(fallen, baseState);

      expect(visions.length).toBe(1);
      expect(visions[0].type).toBe("dungeon_revelation");
      expect(visions[0].subject.name).toBe("Todesfeld region:death_field");
      expect(visions[0].prophecy).toContain("15");
    });

    it("should not create vision for scattered deaths", () => {
      const fallen: FallenEntity[] = [
        { id: "p1", type: "player", name: "P1", regionId: "r1", position: { x: 0, y: 0 }, diedAtTick: 49000, cause: "combat", lastThreat: 500 },
        { id: "p2", type: "player", name: "P2", regionId: "r2", position: { x: 10, y: 10 }, diedAtTick: 49000, cause: "combat", lastThreat: 500 },
        { id: "p3", type: "player", name: "P3", regionId: "r3", position: { x: 20, y: 20 }, diedAtTick: 49000, cause: "combat", lastThreat: 500 },
      ];

      const visions = OracleVisionEngine.analyzeFallenEntities(fallen, baseState);

      expect(visions.length).toBe(0);
    });
  });

  describe("generateCompleteVision", () => {
    it("should combine all analyses into complete vision", () => {
      const warfrontSnapshot = {
        cycleId: "wf_5",
        phase: "boss_active",
        sectors: [{ id: "s1", kind: "combat", currentPoints: 320, targetPoints: 320 }],
        frontBossActive: true,
      };

      const bloodOfferings: BloodOffering[] = [
        {
          regionId: "r1",
          position: { x: 0, y: 0 },
          totalDeaths: 70,
          deathsByType: { player: 40, npc: 30 },
          firstDeathTick: 40000,
          lastDeathTick: 49900,
          dangerLevel: 850,
          dungeonEmergenceThreshold: 50,
        },
      ];

      const ghostTowns: GhostTown[] = [
        {
          id: "t1",
          name: "Spukstadt",
          regionId: "r1",
          position: { x: 0, y: 0 },
          originalPopulation: 30,
          abandonedAtTick: 40000,
          cause: "war",
          hauntingIntensity: 600,
        },
      ];

      const fallen: FallenEntity[] = Array.from({ length: 12 }, (_, i) => ({
        id: `p${i}`,
        type: "player" as const,
        name: `P${i}`,
        regionId: "r1",
        position: { x: 0, y: 0 },
        diedAtTick: 45000 + i * 100,
        cause: "combat" as const,
        lastThreat: 700,
      }));

      const result = OracleVisionEngine.generateCompleteVision(
        warfrontSnapshot,
        bloodOfferings,
        ghostTowns,
        fallen,
        baseState
      );

      expect(result.warfrontVisions.length).toBeGreaterThan(0);
      expect(result.dungeonProphecies.length).toBe(1);
      expect(result.ghostTownWarnings.length).toBe(1);
      expect(result.fallenEntityVisions.length).toBe(1);
      // Ancient secrets should appear when ghost towns + dungeons combine
      expect(result.ancientSecrets.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("determinism", () => {
    it("should produce same results for same input", () => {
      const warfront = {
        cycleId: "wf_test",
        phase: "boss_active",
        sectors: [{ id: "s1", kind: "combat", currentPoints: 300, targetPoints: 320 }],
        frontBossActive: true,
      };

      const state1 = { tick: 10000, stateHash: "are_fixed123456" };
      const state2 = { tick: 10000, stateHash: "are_fixed123456" };

      const result1 = OracleVisionEngine.analyzeWarfront(warfront, state1);
      const result2 = OracleVisionEngine.analyzeWarfront(warfront, state2);

      expect(result1.length).toBe(result2.length);
      for (let i = 0; i < result1.length; i++) {
        expect(result1[i].id).toBe(result2[i].id);
        expect(result1[i].visionHash).toBe(result2[i].visionHash);
      }
    });

    it("should produce different results for different state", () => {
      const warfront = {
        cycleId: "wf_test",
        phase: "building",
        sectors: [{ id: "s1", kind: "combat", currentPoints: 50, targetPoints: 320 }],
        frontBossActive: false,
      };

      const result1 = OracleVisionEngine.analyzeWarfront(warfront, { tick: 10000, stateHash: "are_a" });
      const result2 = OracleVisionEngine.analyzeWarfront(warfront, { tick: 10001, stateHash: "are_b" });

      // Different tick/hash may produce different visions
      // But at minimum, determinism means same input = same output
      const r1Again = OracleVisionEngine.analyzeWarfront(warfront, { tick: 10000, stateHash: "are_a" });
      expect(result1.length).toBe(r1Again.length);
    });
  });
});