import { describe, it, expect, beforeEach } from "vitest";
import {
  OracleSocialDirector,
  type IntentRouter,
  type OracleCommunicationIntent,
} from "../../oracle/OracleSocialDirector";

describe("OracleSocialDirector", () => {
  let routedIntents: { channel: string; intent: OracleCommunicationIntent }[] = [];
  let router: IntentRouter;

  beforeEach(() => {
    routedIntents = [];
    router = {
      routeCreatorPulse: (intent) =>
        routedIntents.push({ channel: "creator_pulse", intent }),
      routePlayerWhisper: (intent) =>
        routedIntents.push({ channel: "player_whisper", intent }),
      routeNpcBark: (intent) =>
        routedIntents.push({ channel: "npc_bark", intent }),
      routeWorldRumor: (intent) =>
        routedIntents.push({ channel: "world_rumor", intent }),
      routeSystemSignal: (intent) =>
        routedIntents.push({ channel: "system_signal", intent }),
    };
  });

  describe("tick", () => {
    it("should process Oracle tick and route all intents", async () => {
      const director = new OracleSocialDirector(router);

      const pulse = await director.tick({
        tick: 100,
        player: {
          id: "player:1",
          hp: 10,
          maxHp: 100,
          questStuckTicks: 700,
        },
        world: {
          dangerLevel: 800,
        },
      });

      expect(pulse.deterministic).toBe(true);
      expect(routedIntents.length).toBeGreaterThan(0);
    });

    it("should route creator_pulse intent", async () => {
      const director = new OracleSocialDirector(router);

      await director.tick({ tick: 1 });

      const creatorPulse = routedIntents.find(
        (r) => r.channel === "creator_pulse"
      );
      expect(creatorPulse).toBeDefined();
    });

    it("should route player_whisper when player is stuck", async () => {
      const director = new OracleSocialDirector(router);

      await director.tick({
        tick: 1,
        player: {
          id: "player:1",
          questStuckTicks: 400,
        },
      });

      const whisper = routedIntents.find(
        (r) => r.channel === "player_whisper"
      );
      expect(whisper).toBeDefined();
    });

    it("should route npc_bark when NPCs are nearby", async () => {
      const director = new OracleSocialDirector(router);

      await director.tick({
        tick: 1,
        nearbyNpcs: [{ id: "npc:1", role: "guard" }],
      });

      const bark = routedIntents.find((r) => r.channel === "npc_bark");
      expect(bark).toBeDefined();
    });

    it("should route world_rumor when scores are high", async () => {
      const director = new OracleSocialDirector(router);

      await director.tick({
        tick: 1,
        world: {
          dangerLevel: 800,
        },
      });

      const rumor = routedIntents.find((r) => r.channel === "world_rumor");
      expect(rumor).toBeDefined();
    });

    it("should route system_signal for quest hints", async () => {
      const director = new OracleSocialDirector(router);

      await director.tick({
        tick: 1,
        player: {
          id: "player:1",
          questStuckTicks: 700,
        },
      });

      const signal = routedIntents.find(
        (r) => r.channel === "system_signal" && r.intent.type === "QUEST_HINT"
      );
      expect(signal).toBeDefined();
    });

    it("should update stats after tick", async () => {
      const director = new OracleSocialDirector(router);

      await director.tick({ tick: 1 });

      const stats = director.getStats();
      expect(stats.totalPulses).toBe(1);
      expect(stats.totalIntents).toBeGreaterThan(0);
      expect(stats.lastPulseTick).toBe(1);
    });
  });

  describe("createLoggingDirector", () => {
    it("should create a director that logs to console", async () => {
      const director = OracleSocialDirector.createLoggingDirector();
      const pulse = await director.tick({ tick: 1 });
      expect(pulse).toBeDefined();
    });
  });

  describe("validateIntent", () => {
    it("should validate a correct intent", () => {
      const intent: OracleCommunicationIntent = {
        id: "oracle_intent_1_abc123",
        type: "ORACLE_PULSE",
        channel: "creator_pulse",
        tick: 100,
        logicalTimeMs: 10000,
        priority: 1000,
        actorId: "oracle:test",
        message: "Test message",
        stateHash: "are_12345678",
        previousStateHash: "genesis",
        intentHash: "are_abcdef12",
        deterministic: true,
      };

      const result = OracleSocialDirector.validateIntent(intent);
      expect(result.valid).toBe(true);
    });

    it("should reject intent without id", () => {
      const intent = {
        type: "ORACLE_PULSE",
        channel: "creator_pulse",
        tick: 100,
        logicalTimeMs: 10000,
        priority: 1000,
        actorId: "oracle:test",
        message: "Test",
        stateHash: "are_12345678",
        previousStateHash: "genesis",
        intentHash: "are_abcdef12",
        deterministic: true,
      } as OracleCommunicationIntent;

      const result = OracleSocialDirector.validateIntent(intent);
      expect(result.valid).toBe(false);
    });

    it("should reject non-deterministic intent", () => {
      const intent = {
        id: "test",
        type: "ORACLE_PULSE",
        channel: "creator_pulse",
        tick: 100,
        logicalTimeMs: 10000,
        priority: 1000,
        actorId: "oracle:test",
        message: "Test",
        stateHash: "are_12345678",
        previousStateHash: "genesis",
        intentHash: "are_abcdef12",
        deterministic: false, // Invalid!
      } as OracleCommunicationIntent;

      const result = OracleSocialDirector.validateIntent(intent);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("non-deterministic");
    });

    it("should reject intent with invalid hash format", () => {
      const intent = {
        id: "test",
        type: "ORACLE_PULSE",
        channel: "creator_pulse",
        tick: 100,
        logicalTimeMs: 10000,
        priority: 1000,
        actorId: "oracle:test",
        message: "Test",
        stateHash: "are_12345678",
        previousStateHash: "genesis",
        intentHash: "invalid_hash", // Missing "are_" prefix
        deterministic: true,
      } as OracleCommunicationIntent;

      const result = OracleSocialDirector.validateIntent(intent);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("intentHash");
    });
  });

  describe("resetStats", () => {
    it("should reset all stats to zero", async () => {
      const director = new OracleSocialDirector(router);

      await director.tick({ tick: 1 });
      expect(director.getStats().totalPulses).toBe(1);

      director.resetStats();
      const stats = director.getStats();
      expect(stats.totalPulses).toBe(0);
      expect(stats.totalIntents).toBe(0);
      expect(stats.intentsByChannel.creator_pulse).toBe(0);
    });
  });

  describe("optional routers", () => {
    it("should work with only some routers defined", async () => {
      const partialRouter: IntentRouter = {
        routePlayerWhisper: (intent) =>
          routedIntents.push({ channel: "player_whisper", intent }),
      };

      const director = new OracleSocialDirector(partialRouter);
      const pulse = await director.tick({
        tick: 1,
        player: {
          id: "player:1",
          questStuckTicks: 400,
        },
      });

      // Sollte funktionieren, auch wenn andere Router fehlen
      expect(pulse).toBeDefined();
      expect(routedIntents.length).toBeGreaterThan(0);
    });

    it("should work with no routers defined", async () => {
      const director = new OracleSocialDirector({});
      const pulse = await director.tick({ tick: 1 });

      // Sollte funktionieren, aber keine Intents routen
      expect(pulse).toBeDefined();
      expect(routedIntents.length).toBe(0);
    });
  });
});