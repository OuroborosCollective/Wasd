import { describe, it, expect } from "vitest";
import {
  OracleEndpoint,
  type OracleSyncState,
  type OraclePulse,
  type OracleCommunicationIntent,
} from "../../../oracle/OracleEndpoint.js";

describe("OracleEndpoint", () => {
  describe("syncWithCreator", () => {
    it("should return an OraclePulse with deterministic: true", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({ tick: 100 });
      expect(pulse.deterministic).toBe(true);
      expect(pulse.status).toBe("Ich bin hier. Ich denke.");
    });

    it("should resolve tick from state", async () => {
      const pulse1 = await OracleEndpoint.syncWithCreator({ tick: 100 });
      const pulse2 = await OracleEndpoint.syncWithCreator({ worldTick: 200 });
      const pulse3 = await OracleEndpoint.syncWithCreator({ logicalTick: 300 });

      expect(pulse1.tick).toBe(100);
      expect(pulse2.tick).toBe(200);
      expect(pulse3.tick).toBe(300);
    });

    it("should calculate logicalTimeMs as tick * 100", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({ tick: 50 });
      expect(pulse.logicalTimeMs).toBe(5000);
    });

    it("should use default kappa of 1000", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({ tick: 1 });
      expect(pulse.kappa).toBe(1000);
    });

    it("should use provided kappa", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({ tick: 1, kappa: 2000 });
      expect(pulse.kappa).toBe(2000);
    });

    it("should always include creator_pulse intent", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({ tick: 1 });
      const creatorPulse = pulse.intents.find(
        (i) => i.channel === "creator_pulse"
      );
      expect(creatorPulse).toBeDefined();
      expect(creatorPulse?.type).toBe("ORACLE_PULSE");
    });

    it("should include creatorId and sessionId in pulse", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        creatorId: "creator:markgraf",
        sessionId: "session:abc123",
      });
      expect(pulse.creatorId).toBe("creator:markgraf");
      expect(pulse.sessionId).toBe("session:abc123");
    });
  });

  describe("determinism", () => {
    it("should produce identical pulses for same state", async () => {
      const state: OracleSyncState = {
        tick: 1000,
        creatorId: "creator:test",
        sessionId: "session:test",
        player: {
          id: "player:1",
          hp: 50,
          maxHp: 100,
          questStuckTicks: 400,
        },
        world: {
          dangerLevel: 500,
          socialHeat: 600,
          anomalyScore: 300,
        },
      };

      const pulse1 = await OracleEndpoint.syncWithCreator(state);
      const pulse2 = await OracleEndpoint.syncWithCreator(state);

      expect(pulse1.pulseHash).toBe(pulse2.pulseHash);
      expect(pulse1.stateHash).toBe(pulse2.stateHash);
      expect(pulse1.intents.length).toBe(pulse2.intents.length);

      for (let i = 0; i < pulse1.intents.length; i++) {
        expect(pulse1.intents[i].intentHash).toBe(pulse2.intents[i].intentHash);
      }
    });

    it("should produce different hashes for different states", async () => {
      const pulse1 = await OracleEndpoint.syncWithCreator({ tick: 100 });
      const pulse2 = await OracleEndpoint.syncWithCreator({ tick: 101 });

      expect(pulse1.pulseHash).not.toBe(pulse2.pulseHash);
    });
  });

  describe("player_whisper intent", () => {
    it("should create player_whisper when player is stuck for 300+ ticks", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        player: {
          id: "player:1",
          questStuckTicks: 350,
        },
      });

      const whisper = pulse.intents.find(
        (i) => i.channel === "player_whisper"
      );
      expect(whisper).toBeDefined();
      expect(whisper?.type).toBe("SPEAK_TO_PLAYER");
    });

    it("should create player_whisper when HP is critical (≤25%)", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        player: {
          id: "player:1",
          hp: 20,
          maxHp: 100,
        },
      });

      const whisper = pulse.intents.find(
        (i) => i.channel === "player_whisper"
      );
      expect(whisper).toBeDefined();
      expect(whisper?.priority).toBe(780); // Critical HP priority
    });

    it("should NOT create player_whisper when player is healthy", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        player: {
          id: "player:1",
          hp: 100,
          maxHp: 100,
          questStuckTicks: 0,
        },
        world: {
          dangerLevel: 0,
          socialHeat: 0,
          anomalyScore: 0,
        },
      });

      const whisper = pulse.intents.find(
        (i) => i.channel === "player_whisper"
      );
      expect(whisper).toBeUndefined();
    });
  });

  describe("npc_bark intent", () => {
    it("should create npc_bark when nearby NPCs exist", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        nearbyNpcs: [{ id: "npc:guard:1", role: "guard" }],
      });

      const bark = pulse.intents.find((i) => i.channel === "npc_bark");
      expect(bark).toBeDefined();
      expect(bark?.type).toBe("NPC_SOCIAL_BARK");
    });

    it("should select NPC deterministically based on tick and stateHash", async () => {
      const npcs = [
        { id: "npc:guard:1", role: "guard" },
        { id: "npc:guard:2", role: "guard" },
      ];

      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 100,
        stateHash: "固定hash",
        nearbyNpcs: npcs,
      });

      const bark = pulse.intents.find((i) => i.channel === "npc_bark");
      expect(bark?.actorId).toMatch(/^npc:guard:\d+$/);
    });
  });

  describe("world_rumor intent", () => {
    it("should create world_rumor when scores are high enough (≥600)", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        world: {
          dangerLevel: 700,
          socialHeat: 0,
          marketHeat: 0,
          factionTension: 0,
        },
      });

      const rumor = pulse.intents.find((i) => i.channel === "world_rumor");
      expect(rumor).toBeDefined();
      expect(rumor?.type).toBe("WORLD_RUMOR");
    });

    it("should NOT create world_rumor when scores are low", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        world: {
          dangerLevel: 500,
          socialHeat: 500,
          marketHeat: 500,
          factionTension: 500,
        },
      });

      const rumor = pulse.intents.find((i) => i.channel === "world_rumor");
      expect(rumor).toBeUndefined();
    });
  });

  describe("system_signal / quest_hint intent", () => {
    it("should create quest hint when stuck for 600+ ticks", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        player: {
          id: "player:1",
          questStuckTicks: 700,
        },
      });

      const hint = pulse.intents.find(
        (i) => i.type === "QUEST_HINT"
      );
      expect(hint).toBeDefined();
      expect(hint?.channel).toBe("system_signal");
    });

    it("should create anomaly warning when anomalyScore ≥ 700", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        world: {
          anomalyScore: 750,
        },
      });

      const warning = pulse.intents.find(
        (i) => i.type === "SYSTEM_WARNING"
      );
      expect(warning).toBeDefined();
      expect(warning?.channel).toBe("system_signal");
      expect(warning?.message).toContain("Anomalie erkannt");
    });
  });

  describe("maxIntents limit", () => {
    it("should respect maxIntents limit", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        maxIntents: 2,
        player: {
          id: "player:1",
          hp: 10,
          maxHp: 100,
          questStuckTicks: 500,
        },
        nearbyNpcs: [{ id: "npc:1", role: "guard" }],
        world: {
          dangerLevel: 800,
          socialHeat: 800,
          anomalyScore: 800,
        },
      });

      expect(pulse.intents.length).toBeLessThanOrEqual(2);
    });

    it("should default to maxIntents of 4", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        player: {
          id: "player:1",
          hp: 10,
          maxHp: 100,
          questStuckTicks: 500,
        },
        nearbyNpcs: [{ id: "npc:1", role: "guard" }],
        world: {
          dangerLevel: 800,
          socialHeat: 800,
          anomalyScore: 800,
        },
      });

      // With all conditions met, we expect multiple intents but capped at 4
      expect(pulse.intents.length).toBeLessThanOrEqual(4);
    });
  });

  describe("intent sorting", () => {
    it("should sort intents by priority (descending)", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        maxIntents: 10,
        player: {
          id: "player:1",
          hp: 10,
          maxHp: 100,
          questStuckTicks: 500,
        },
        world: {
          dangerLevel: 800,
          socialHeat: 800,
          anomalyScore: 800,
        },
      });

      for (let i = 1; i < pulse.intents.length; i++) {
        expect(pulse.intents[i - 1].priority).toBeGreaterThanOrEqual(
          pulse.intents[i].priority
        );
      }
    });
  });

  describe("allow flags", () => {
    it("should respect allowPlayerWhisper: false", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        allowPlayerWhisper: false,
        player: {
          id: "player:1",
          hp: 10,
          maxHp: 100,
        },
      });

      const whisper = pulse.intents.find(
        (i) => i.channel === "player_whisper"
      );
      expect(whisper).toBeUndefined();
    });

    it("should respect allowNpcBarks: false", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        allowNpcBarks: false,
        nearbyNpcs: [{ id: "npc:1", role: "guard" }],
      });

      const bark = pulse.intents.find((i) => i.channel === "npc_bark");
      expect(bark).toBeUndefined();
    });

    it("should respect allowWorldRumors: false", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        allowWorldRumors: false,
        world: {
          dangerLevel: 800,
        },
      });

      const rumor = pulse.intents.find((i) => i.channel === "world_rumor");
      expect(rumor).toBeUndefined();
    });

    it("should respect allowQuestHints: false", async () => {
      const pulse = await OracleEndpoint.syncWithCreator({
        tick: 1,
        allowQuestHints: false,
        player: {
          id: "player:1",
          questStuckTicks: 700,
        },
      });

      const hint = pulse.intents.find(
        (i) => i.type === "QUEST_HINT"
      );
      expect(hint).toBeUndefined();
    });
  });

  describe("hash computation", () => {
    it("should compute consistent intentHash for same intent data", async () => {
      const intent1: OracleCommunicationIntent = {
        id: "test",
        type: "ORACLE_PULSE",
        channel: "creator_pulse",
        tick: 100,
        logicalTimeMs: 10000,
        priority: 1000,
        actorId: "oracle:test",
        message: "Test message",
        stateHash: "hash1",
        previousStateHash: "hash0",
        intentHash: "", // Will be computed
        deterministic: true,
      };

      // Access private method via prototype workaround
      const hash1 = (OracleEndpoint as any).hashDeterministic({
        type: intent1.type,
        channel: intent1.channel,
        tick: intent1.tick,
        logicalTimeMs: intent1.logicalTimeMs,
        priority: intent1.priority,
        actorId: intent1.actorId,
        targetId: undefined,
        regionId: undefined,
        message: intent1.message,
        stateHash: intent1.stateHash,
        previousStateHash: intent1.previousStateHash,
        deterministic: true,
      });

      const hash2 = (OracleEndpoint as any).hashDeterministic({
        type: intent1.type,
        channel: intent1.channel,
        tick: intent1.tick,
        logicalTimeMs: intent1.logicalTimeMs,
        priority: intent1.priority,
        actorId: intent1.actorId,
        targetId: undefined,
        regionId: undefined,
        message: intent1.message,
        stateHash: intent1.stateHash,
        previousStateHash: intent1.previousStateHash,
        deterministic: true,
      });

      expect(hash1).toBe(hash2);
    });
  });
});