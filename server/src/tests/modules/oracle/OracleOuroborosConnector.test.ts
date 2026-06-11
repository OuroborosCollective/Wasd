import { describe, it, expect, beforeEach } from "vitest";
import {
  OracleOuroborosConnector,
  type OuroborosObservation,
  type NPCVision,
} from "../../oracle/OracleOuroborosConnector";

describe("OracleOuroborosConnector", () => {
  let connector: OracleOuroborosConnector;

  beforeEach(() => {
    connector = new OracleOuroborosConnector({
      visionInterval: 100,
      maxVisionsPerNpc: 5,
      prophecyStrengthBase: 500,
    });
  });

  describe("observeOuroborosTick", () => {
    it("should create observation from Ouroboros data", () => {
      const observation = connector.observeOuroborosTick(
        1000,
        {
          getRecentEvents: () => [],
        } as any,
        {
          getAllFactions: () => [],
          resolveConflicts: () => [],
        } as any,
        {
          getRegions: () => [],
          getEstablishedRoutes: () => [],
        } as any,
        "are_test_hash"
      );

      expect(observation.tick).toBe(1000);
      expect(observation.stateHash).toBe("are_test_hash");
      expect(observation.factionWars).toEqual([]);
      expect(observation.npcMassDeaths).toEqual([]);
    });

    it("should detect war_declared events", () => {
      const mockHistory = {
        getRecentEvents: () => [
          {
            type: "war_declared",
            actorName: "Clan Iron",
            targetName: "Clan Fire",
            intensity: 0.95,
          },
        ],
      };

      const observation = connector.observeOuroborosTick(
        1000,
        mockHistory as any,
        {} as any,
        {} as any,
        "are_hash"
      );

      expect(observation.factionWars.length).toBe(1);
      expect(observation.factionWars[0].factionA).toBe("Clan Iron");
      expect(observation.factionWars[0].factionB).toBe("Clan Fire");
      expect(observation.factionWars[0].intensity).toBe(0.95);
    });

    it("should detect npc_mass_death events", () => {
      const mockHistory = {
        getRecentEvents: () => [
          {
            type: "npc_mass_death",
            data: { regionId: "north_plains", cause: "plague", count: 50 },
          },
        ],
      };

      const observation = connector.observeOuroborosTick(
        1000,
        mockHistory as any,
        {} as any,
        {} as any,
        "are_hash"
      );

      expect(observation.npcMassDeaths.length).toBe(1);
      expect(observation.npcMassDeaths[0].regionId).toBe("north_plains");
      expect(observation.npcMassDeaths[0].count).toBe(50);
    });

    it("should detect warfront_boss_active", () => {
      const mockHistory = {
        getRecentEvents: () => [
          { type: "warfront_boss_active", intensity: 1.0 },
        ],
      };

      const observation = connector.observeOuroborosTick(
        1000,
        mockHistory as any,
        {} as any,
        {} as any,
        "are_hash"
      );

      expect(observation.warfrontActive).toBe(true);
      expect(observation.warfrontPhase).toBe("boss_active");
    });
  });

  describe("NPC Vision Integration", () => {
    it("should create vision for NPC based on distance", () => {
      const vision = {
        id: "vision_1",
        tick: 1000,
        stateHash: "are_hash",
        type: "dungeon_revelation" as const,
        priority: 700,
        certainty: 800,
        subject: {
          type: "dungeon",
          id: "dungeon_1",
          name: "Schattengruft",
          position: { x: 100, y: -50 },
        },
        prophecy: "Eine Gruft erwacht aus vergessenem Blut.",
        interpretation: "Sei vorsichtig, Krieger.",
        visionHash: "are_abc123",
      };

      // NPC sehr nah
      const npcNearPosition = { x: 110, y: -50 };
      const npcFarPosition = { x: 400, y: -50 };

      const nearNPCVision = connector.transformVisionForNPC(
        vision,
        "npc_1",
        npcNearPosition
      );
      const farNPCVision = connector.transformVisionForNPC(
        vision,
        "npc_2",
        npcFarPosition
      );

      // Nahe NPC sollte stärkere Vision haben
      expect(nearNPCVision.strength).toBeGreaterThan(farNPCVision.strength);
      expect(nearNPCVision.npcId).toBe("npc_1");
      expect(farNPCVision.npcId).toBe("npc_2");
    });

    it("should limit visions per NPC", () => {
      const connectorSmall = new OracleOuroborosConnector({
        maxVisionsPerNpc: 3,
      });

      // Füge mehr Visionen hinzu als erlaubt
      for (let i = 0; i < 5; i++) {
        connectorSmall.addVisionToNPC("npc_test", {
          visionId: `v_${i}`,
          npcId: "npc_test",
          tick: 1000 + i,
          type: "warning",
          strength: 500,
          message: `Vision ${i}`,
          certainty: 700,
          visionHash: `are_${i}`,
        });
      }

      const visions = connectorSmall.getNPCVisions("npc_test");
      expect(visions.length).toBe(3); // Auf 3 limitiert
      expect(visions[0].visionId).toBe("v_2"); // Älteste entfernt
      expect(visions[2].visionId).toBe("v_4"); // Neueste behalten
    });

    it("should get latest vision of specific type", () => {
      connector.addVisionToNPC("npc_1", {
        visionId: "v_warning",
        npcId: "npc_1",
        tick: 900,
        type: "warning",
        strength: 500,
        message: "Alte Warnung",
        certainty: 600,
        visionHash: "are_old",
      });

      connector.addVisionToNPC("npc_1", {
        visionId: "v_guidance",
        npcId: "npc_1",
        tick: 950,
        type: "guidance",
        strength: 400,
        message: "Neue Führung",
        certainty: 700,
        visionHash: "are_new",
      });

      connector.addVisionToNPC("npc_1", {
        visionId: "v_warning_new",
        npcId: "npc_1",
        tick: 1000,
        type: "warning",
        strength: 600,
        message: "Neue Warnung",
        certainty: 800,
        visionHash: "are_newest",
      });

      const latestWarning = connector.getLatestVisionOfType("npc_1", "warning");
      const latestGuidance = connector.getLatestVisionOfType("npc_1", "guidance");

      expect(latestWarning?.visionId).toBe("v_warning_new");
      expect(latestGuidance?.visionId).toBe("v_guidance");
    });
  });

  describe("processNPCDecision", () => {
    it("should not modify action when no visions", () => {
      const result = connector.processNPCDecision("npc_no_vision", "explore", {
        tick: 1000,
        dangerLevel: 0.2,
      });

      expect(result.action).toBe("explore");
      expect(result.modified).toBe(false);
    });

    it("should modify explore to idle on warning vision", () => {
      connector.addVisionToNPC("npc_cautious", {
        visionId: "v_warn",
        npcId: "npc_cautious",
        tick: 1000,
        type: "warning",
        strength: 600,
        message: "Die Schatten flüstern von Gefahr",
        certainty: 800,
        visionHash: "are_warn",
      });

      const result = connector.processNPCDecision("npc_cautious", "explore", {
        tick: 1000,
        dangerLevel: 0.2,
      });

      expect(result.action).toBe("idle");
      expect(result.modified).toBe(true);
      expect(result.reason).toContain("Oracle warnt");
    });

    it("should modify idle to patrol on omen vision", () => {
      connector.addVisionToNPC("npc_omen", {
        visionId: "v_omen",
        npcId: "npc_omen",
        tick: 1000,
        type: "omen",
        strength: 700,
        message: "Ein Unheil naht",
        certainty: 900,
        visionHash: "are_omen",
      });

      const result = connector.processNPCDecision("npc_omen", "idle", {
        tick: 1000,
        dangerLevel: 0.1,
      });

      expect(result.action).toBe("patrol");
      expect(result.modified).toBe(true);
    });

    it("should keep action with ancient_knowledge but mark as modified", () => {
      connector.addVisionToNPC("npc_wise", {
        visionId: "v_ancient",
        npcId: "npc_wise",
        tick: 1000,
        type: "ancient_knowledge",
        strength: 800,
        message: "Das Wissen der Ältesten flüstert...",
        certainty: 950,
        visionHash: "are_ancient",
      });

      const result = connector.processNPCDecision("npc_wise", "wander", {
        tick: 1000,
        dangerLevel: 0.5,
      });

      expect(result.action).toBe("wander"); // Action bleibt
      expect(result.modified).toBe(true); // Aber als modifiziert markiert
      expect(result.reason).toContain("Wissen der Ahnen");
    });
  });

  describe("distributeVisionsToNPCs", () => {
    it("should distribute visions to nearby NPCs", () => {
      const visions = [
        {
          id: "v1",
          tick: 1000,
          stateHash: "are_hash",
          type: "dungeon_revelation" as const,
          priority: 700,
          certainty: 800,
          subject: {
            type: "dungeon",
            id: "d1",
            name: "Test Dungeon",
            position: { x: 100, y: 100 },
          },
          prophecy: "Test Prophecy",
          interpretation: "Test",
          visionHash: "are_v1",
        },
      ];

      const npcs = [
        { id: "npc_near", name: "Near NPC", position: { x: 105, y: 100 } },
        { id: "npc_far", name: "Far NPC", position: { x: 500, y: 500 } },
      ];

      connector.distributeVisionsToNPCs(visions, npcs);

      const nearVisions = connector.getNPCVisions("npc_near");
      const farVisions = connector.getNPCVisions("npc_far");

      expect(nearVisions.length).toBe(1);
      expect(farVisions.length).toBe(0); // Zu weit weg
    });
  });

  describe("getStats", () => {
    it("should return correct stats", () => {
      // Beobachtung hinzufügen
      connector.observeOuroborosTick(1000, { getRecentEvents: () => [] } as any, {} as any, {} as any, "h1");
      connector.observeOuroborosTick(1100, { getRecentEvents: () => [] } as any, {} as any, {} as any, "h2");

      // Visionen hinzufügen
      connector.addVisionToNPC("npc_1", {
        visionId: "v1",
        npcId: "npc_1",
        tick: 1000,
        type: "warning",
        strength: 500,
        message: "Test",
        certainty: 700,
        visionHash: "are_1",
      });

      const stats = connector.getStats();

      expect(stats.totalObservations).toBe(2);
      expect(stats.totalNPCVisions).toBe(1);
    });
  });

  describe("reset", () => {
    it("should clear all data", () => {
      connector.observeOuroborosTick(1000, { getRecentEvents: () => [] } as any, {} as any, {} as any, "h1");
      connector.addVisionToNPC("npc_1", {
        visionId: "v1",
        npcId: "npc_1",
        tick: 1000,
        type: "warning",
        strength: 500,
        message: "Test",
        certainty: 700,
        visionHash: "are_1",
      });

      connector.reset();

      const stats = connector.getStats();
      expect(stats.totalObservations).toBe(0);
      expect(stats.totalNPCVisions).toBe(0);
    });
  });
});