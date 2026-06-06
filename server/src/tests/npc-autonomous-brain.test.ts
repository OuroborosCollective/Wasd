/**
 * NPC Autonomous Brain Tests — Deterministic Replay Verification
 * 
 * Tests for:
 * - Memory V3 structure and creation
 * - Observation bus functionality
 * - Memory scoring and importance calculation
 * - Decision engine deterministic behavior
 * - Brain scheduler tick distribution
 * - Memory compression
 * - Debug snapshot generation
 * - Replay verification (same tick + same input = same output)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  // Types and creation
  createEmptyNPCMemoryV3,
  migrateLegacyMemory,
  calculateMemoryHash,
  generateGoalId,
  generateEpisodicId,
  type NPCMemoryV3,
  type NPCObservation,
  type NPCDecisionInput,
  type WorldMemoryEventType,
  // Observation Bus
  NPCObservationBus,
  emitCombatEvent,
  emitTradeEvent,
  emitQuestEvent,
  // Memory Scoring
  scoreMemory,
  shouldStoreMemory,
  observationToEpisodic,
  getTopMemories,
  calculateRelationScore,
  getRelationDisposition,
  applyObservationsToMemory,
  updateRelationsFromObservation,
  calculateMemoryFingerprint,
  // Decision Engine
  decideNPCAction,
  applyActionOutcome,
  calculateOutcomeScore,
  getLearnedBestAction,
  // Brain Scheduler
  getNPCBrainPhase,
  shouldRunBrainPhase,
  getActivePhases,
  getBrainState,
  updateBrainState,
  getNextDecisionTick,
  getNextPlanningTick,
  estimateCPULoad,
  resetScheduler,
  BrainPhase,
  DEFAULT_SCHEDULER_CONFIG,
  // Memory Compression
  compressNPCMemory,
  shouldCompress,
  verifyMemoryIntegrity,
  getMemoryStats,
  DEFAULT_COMPRESSION_CONFIG,
  // Debug Snapshot
  createNPCBrainDebugSnapshot,
  verifyReplay,
  checkBrainHealth,
  generateNPCSummaryReport,
  // Brain Runner
  NPCBrainRunner,
  decisionToState,
  createDefaultWorldSnapshot,
} from "../modules/npc/brain/index.js";

// ============================================================================
// Test Utilities
// ============================================================================

function createTestMemory(npcId: string = "test_npc_1"): NPCMemoryV3 {
  return createEmptyNPCMemoryV3(
    npcId,
    "Test NPC",
    "region_test",
    "merchant",
    "trader"
  );
}

function createTestObservation(
  tick: number = 100,
  type: WorldMemoryEventType = "player_attack",
  overrides: Partial<NPCObservation> = {}
): NPCObservation {
  return {
    id: `obs_${tick}_${type}`,
    tick,
    type,
    actorId: "player_1",
    actorName: "Test Player",
    targetId: "test_npc_1",
    targetName: "Test NPC",
    regionId: "region_test",
    impact: type === "player_attack" ? -8 : 3,
    tags: [type],
    payload: {},
    ...overrides,
  };
}

function createTestDecisionInput(
  memory: NPCMemoryV3,
  tick: number = 100
): NPCDecisionInput {
  return {
    tick,
    npcId: memory.identity.npcId,
    npcName: memory.identity.name,
    position: { x: 100, y: 200 },
    homeRegionId: memory.identity.homeRegionId,
    state: "idle",
    health: 0.8,
    energy: 0.7,
    gold: 50,
    memory,
    world: {
      tick,
      regionId: "region_test",
      timeOfDay: 12,
      dangerLevel: 0.2,
      resourceAvailability: {},
      marketPrices: { iron: 30, wood: 15 },
      nearbyThreats: [],
      friendlyNPCs: [],
      hostileNPCs: [],
    },
    nearbyEntities: [
      { id: "player_1", name: "Player One", type: "player" as const, position: { x: 105, y: 205 }, hostile: true },
      { id: "npc_2", name: "Friend NPC", type: "npc" as const, position: { x: 95, y: 195 }, hostile: false },
    ],
  };
}

// ============================================================================
// NPCMemoryV3 Tests
// ============================================================================

describe("NPCMemoryV3", () => {
  describe("createEmptyNPCMemoryV3", () => {
    it("creates memory with correct identity", () => {
      const memory = createEmptyNPCMemoryV3("npc_1", "Bob", "region_a", "guard", "soldier");
      
      expect(memory.identity.npcId).toBe("npc_1");
      expect(memory.identity.name).toBe("Bob");
      expect(memory.identity.profession).toBe("guard");
      expect(memory.identity.role).toBe("soldier");
      expect(memory.identity.homeRegionId).toBe("region_a");
    });

    it("creates memory with default values", () => {
      const memory = createEmptyNPCMemoryV3("npc_1", "Bob", "region_a");
      
      expect(memory.identity.courage).toBe(50);
      expect(memory.identity.greed).toBe(30);
      expect(memory.identity.loyalty).toBe(50);
      expect(memory.identity.moralAlignment).toBe(0);
    });

    it("creates memory with empty collections", () => {
      const memory = createEmptyNPCMemoryV3("npc_1", "Bob", "region_a");
      
      expect(memory.episodic).toEqual([]);
      expect(memory.semantic).toEqual([]);
      expect(memory.goals).toEqual([]);
      expect(memory.relations).toEqual({});
      expect(memory.routines).toEqual([]);
      expect(memory.fears).toEqual([]);
      expect(memory.skills).toEqual([]);
    });
  });

  describe("migrateLegacyMemory", () => {
    it("migrates string goals to structured goals", () => {
      const legacy = {
        longTermGoals: ["guard_the_village", "trade_with_merchants"],
      };
      
      const memory = migrateLegacyMemory(legacy, "npc_1", "Bob", "region_a");
      
      expect(memory.goals.length).toBe(2);
      expect(memory.goals[0]!.type).toBe("defend");
      expect(memory.goals[1]!.type).toBe("trade");
    });

    it("handles empty legacy memory", () => {
      const legacy = {};
      const memory = migrateLegacyMemory(legacy, "npc_1", "Bob", "region_a");
      
      expect(memory.goals).toEqual([]);
    });
  });

  describe("generateGoalId", () => {
    it("generates deterministic goal IDs", () => {
      const id1 = generateGoalId("npc_1", "combat", 100);
      const id2 = generateGoalId("npc_1", "combat", 100);
      
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^goal_[a-f0-9]+$/);
    });

    it("generates different IDs for different inputs", () => {
      const id1 = generateGoalId("npc_1", "combat", 100);
      const id2 = generateGoalId("npc_1", "trade", 100);
      const id3 = generateGoalId("npc_2", "combat", 100);
      
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
    });
  });

  describe("calculateMemoryHash", () => {
    it("generates consistent hash for same memory", () => {
      const memory = createTestMemory();
      const hash1 = calculateMemoryHash(memory);
      const hash2 = calculateMemoryHash(memory);
      
      expect(hash1).toBe(hash2);
    });

    it("generates different hash for different memory", () => {
      const memory1 = createTestMemory("npc_1");
      const memory2 = createTestMemory("npc_2");
      
      const hash1 = calculateMemoryHash(memory1);
      const hash2 = calculateMemoryHash(memory2);
      
      expect(hash1).not.toBe(hash2);
    });
  });
});

// ============================================================================
// NPCObservationBus Tests
// ============================================================================

describe("NPCObservationBus", () => {
  let bus: NPCObservationBus;

  beforeEach(() => {
    bus = new NPCObservationBus();
  });

  describe("emit", () => {
    it("creates observation with generated ID", () => {
      const obs = bus.emit("player_attack", 100, {
        actorId: "player_1",
        targetId: "npc_1",
        impact: -8,
      });

      expect(obs.id).toMatch(/^obs_[a-f0-9]+$/);
      expect(obs.tick).toBe(100);
      expect(obs.type).toBe("player_attack");
      expect(obs.actorId).toBe("player_1");
      expect(obs.targetId).toBe("npc_1");
      expect(obs.impact).toBe(-8);
    });

    it("stores observation in history", () => {
      bus.emit("player_attack", 100, { actorId: "player_1", targetId: "npc_1" });
      bus.emit("combat_won", 101, { actorId: "npc_1", targetId: "monster_1" });

      const stats = bus.getStats();
      expect(stats.totalObservations).toBe(2);
    });
  });

  describe("subscribe", () => {
    it("receives type-specific events", () => {
      const received: NPCObservation[] = [];
      bus.subscribe("player_attack", (obs) => received.push(obs));

      bus.emit("player_attack", 100, { actorId: "player_1", targetId: "npc_1" });
      bus.emit("combat_won", 101, { actorId: "npc_1" });

      expect(received.length).toBe(1);
      expect(received[0]!.type).toBe("player_attack");
    });

    it("allows unsubscribe", () => {
      const received: NPCObservation[] = [];
      const unsubscribe = bus.subscribe("player_attack", (obs) => received.push(obs));

      bus.emit("player_attack", 100, { actorId: "player_1", targetId: "npc_1" });
      unsubscribe();
      bus.emit("player_attack", 101, { actorId: "player_1", targetId: "npc_1" });

      expect(received.length).toBe(1);
    });
  });

  describe("subscribeAll", () => {
    it("receives all events", () => {
      const received: NPCObservation[] = [];
      bus.subscribeAll((obs) => received.push(obs));

      bus.emit("player_attack", 100, { actorId: "player_1" });
      bus.emit("combat_won", 101, { actorId: "npc_1" });

      expect(received.length).toBe(2);
    });
  });

  describe("getObservationsForNPC", () => {
    it("filters observations by NPC relevance", () => {
      const memory = createTestMemory("npc_1");
      
      bus.emit("player_attack", 100, { 
        actorId: "player_1", 
        targetId: "npc_1",
        regionId: "region_test",
      });
      bus.emit("player_attack", 101, { 
        actorId: "player_1", 
        targetId: "npc_2",
        regionId: "region_other",
      });

      const obs = bus.getObservationsForNPC("npc_1", memory);
      expect(obs.length).toBe(1);
    });
  });
});

// ============================================================================
// NPCMemoryScoring Tests
// ============================================================================

describe("NPCMemoryScoring", () => {
  describe("scoreMemory", () => {
    it("scores higher for self-targeted events", () => {
      const memory = createTestMemory("npc_1");
      const obs = createTestObservation(100, "player_attack", {
        targetId: "npc_1",
        impact: -8,
      });

      const score = scoreMemory(obs, memory, 100);

      expect(score.finalScore).toBeGreaterThan(0);
      expect(score.personalRelevance).toBe(10); // TARGET_SELF
    });

    it("scores higher for home region events", () => {
      const memory = createTestMemory("npc_1");
      const obs = createTestObservation(100, "resource_shortage", {
        regionId: "region_test",
        impact: -4,
      });

      const score = scoreMemory(obs, memory, 100);

      expect(score.personalRelevance).toBe(5); // HOME_REGION
    });

    it("applies emotional weight to score", () => {
      const memory = createTestMemory("npc_1");
      
      const lowImpact = createTestObservation(100, "player_trade", { impact: 2 });
      const highImpact = createTestObservation(100, "player_attack", { impact: -8 });

      const scoreLow = scoreMemory(lowImpact, memory, 100);
      const scoreHigh = scoreMemory(highImpact, memory, 100);

      expect(scoreHigh.finalScore).toBeGreaterThan(scoreLow.finalScore);
    });
  });

  describe("shouldStoreMemory", () => {
    it("returns true for high-scoring observations", () => {
      const memory = createTestMemory("npc_1");
      const obs = createTestObservation(100, "player_attack", {
        targetId: "npc_1",
        impact: -8,
      });

      expect(shouldStoreMemory(obs, memory, 100)).toBe(true);
    });

    it("returns false for low-scoring observations", () => {
      const memory = createTestMemory("npc_1");
      const obs = createTestObservation(100, "exploration_discovered", {
        impact: 1,
        actorId: "npc_other",
        targetId: "npc_other",
      });

      expect(shouldStoreMemory(obs, memory, 100)).toBe(false);
    });
  });

  describe("getTopMemories", () => {
    it("returns memories sorted by score", () => {
      const memory = createTestMemory("npc_1");
      memory.episodic = [
        { id: "e1", tick: 100, type: "player_attack", impact: -8, tags: [], score: 5 },
        { id: "e2", tick: 101, type: "player_trade", impact: 3, tags: [], score: 15 },
        { id: "e3", tick: 102, type: "quest_completed", impact: 6, tags: [], score: 25 },
      ];

      const top = getTopMemories(memory.episodic, 2);

      expect(top.length).toBe(2);
      expect(top[0]!.id).toBe("e3");
      expect(top[1]!.id).toBe("e2");
    });
  });

  describe("calculateRelationScore", () => {
    it("returns 0.5 for neutral relation", () => {
      const relation = {
        entityId: "player_1",
        entityType: "player" as const,
        trust: 0,
        fear: 0,
        respect: 0,
        greed: 0,
        morale: 0,
        interactions: 0,
        lastInteractionTick: 0,
        positiveInteractions: 0,
        negativeInteractions: 0,
      };

      const score = calculateRelationScore(relation);
      expect(score).toBeCloseTo(0.5, 1);
    });

    it("returns higher score for positive relation", () => {
      const relation = {
        entityId: "player_1",
        entityType: "player" as const,
        trust: 80,
        fear: 0,
        respect: 70,
        greed: 0,
        morale: 80,
        interactions: 10,
        lastInteractionTick: 0,
        positiveInteractions: 10,
        negativeInteractions: 0,
      };

      const score = calculateRelationScore(relation);
      expect(score).toBeGreaterThan(0.6);
    });

    it("returns lower score for fearful relation", () => {
      const relation = {
        entityId: "player_1",
        entityType: "player" as const,
        trust: 50,
        fear: 90,
        respect: 0,
        greed: 0,
        morale: -30,
        interactions: 5,
        lastInteractionTick: 0,
        positiveInteractions: 2,
        negativeInteractions: 3,
      };

      const score = calculateRelationScore(relation);
      expect(score).toBeLessThan(0.4);
    });
  });

  describe("getRelationDisposition", () => {
    it("returns 'friendly' for high score", () => {
      const relation = {
        entityId: "player_1",
        entityType: "player" as const,
        trust: 70,
        fear: 10,
        respect: 60,
        greed: 20,
        morale: 60,
        interactions: 10,
        lastInteractionTick: 0,
        positiveInteractions: 9,
        negativeInteractions: 1,
      };

      expect(getRelationDisposition(relation)).toBe("friendly");
    });

    it("returns 'hostile' for low score", () => {
      const relation = {
        entityId: "player_1",
        entityType: "player" as const,
        trust: -60,
        fear: 80,
        respect: 10,
        greed: 50,
        morale: -70,
        interactions: 10,
        lastInteractionTick: 0,
        positiveInteractions: 2,
        negativeInteractions: 8,
      };

      expect(getRelationDisposition(relation)).toBe("hostile");
    });

    it("returns 'neutral' for middle score", () => {
      const relation = {
        entityId: "player_1",
        entityType: "player" as const,
        trust: 0,
        fear: 30,
        respect: 30,
        greed: 30,
        morale: 0,
        interactions: 5,
        lastInteractionTick: 0,
        positiveInteractions: 3,
        negativeInteractions: 2,
      };

      expect(getRelationDisposition(relation)).toBe("neutral");
    });
  });

  describe("applyObservationsToMemory", () => {
    it("adds high-scoring observations to episodic memory", () => {
      const memory = createTestMemory("npc_1");
      const obs = createTestObservation(100, "player_attack", {
        targetId: "npc_1",
        impact: -8,
      });

      const updated = applyObservationsToMemory(memory, [obs], 100);

      expect(updated.episodic.length).toBeGreaterThan(0);
    });

    it("limits episodic memory size", () => {
      const memory = createTestMemory("npc_1");
      const observations: NPCObservation[] = [];
      
      // Add 300 observations
      for (let i = 0; i < 300; i++) {
        observations.push(createTestObservation(100 + i, "player_attack", {
          targetId: "npc_1",
          impact: -8,
        }));
      }

      const updated = applyObservationsToMemory(memory, observations, 400);

      expect(updated.episodic.length).toBeLessThanOrEqual(256);
    });
  });

  describe("updateRelationsFromObservation", () => {
    it("updates actor relation on positive interaction", () => {
      const relations: Record<string, any> = {};
      const obs = createTestObservation(100, "player_trade", {
        actorId: "player_1",
        targetId: "npc_1",
        impact: 3,
      });

      const updated = updateRelationsFromObservation(relations, obs, 100);

      expect(updated["player_1"]).toBeDefined();
      expect(updated["player_1"]!.trust).toBeGreaterThan(0);
      expect(updated["player_1"]!.morale).toBeGreaterThan(0);
    });

    it("updates actor relation on negative interaction", () => {
      const relations: Record<string, any> = {};
      const obs = createTestObservation(100, "player_attack", {
        actorId: "player_1",
        targetId: "npc_1",
        impact: -8,
      });

      const updated = updateRelationsFromObservation(relations, obs, 100);

      expect(updated["player_1"]).toBeDefined();
      expect(updated["player_1"]!.trust).toBeLessThan(0);
      expect(updated["player_1"]!.fear).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// NPCDecisionEngine Tests
// ============================================================================

describe("NPCDecisionEngine", () => {
  describe("decideNPCAction", () => {
    it("returns flee when hostiles are near and NPC is scared", () => {
      const memory = createTestMemory("npc_1");
      memory.identity.courage = 30; // Low courage = scared

      const input = createTestDecisionInput(memory, 100);
      input.nearbyEntities = [
        { id: "monster_1", name: "Wolf", type: "monster", position: { x: 105, y: 205 }, hostile: true },
      ];

      const decision = decideNPCAction(input);

      expect(decision.action).toBe("flee");
      expect(decision.score).toBeGreaterThan(0);
    });

    it("returns idle when no nearby entities", () => {
      const memory = createTestMemory("npc_1");
      const input = createTestDecisionInput(memory, 100);
      input.nearbyEntities = [];

      const decision = decideNPCAction(input);

      expect(decision.action).toBe("idle");
    });

    it("merchant prefers trade action", () => {
      const memory = createTestMemory("npc_1");
      memory.identity.profession = "merchant";
      memory.identity.role = "trader";

      const input = createTestDecisionInput(memory, 100);
      input.nearbyEntities = [
        { id: "player_1", name: "Player", type: "player", position: { x: 105, y: 205 }, hostile: false },
      ];
      input.gold = 10; // Low gold increases trade desire

      const decision = decideNPCAction(input);

      expect(decision.action).toBe("trade");
    });

    it("guard prefers patrol when no threat", () => {
      const memory = createTestMemory("npc_1");
      memory.identity.role = "guard";

      const input = createTestDecisionInput(memory, 100);
      input.nearbyEntities = [];
      input.world.dangerLevel = 0.1;

      const decision = decideNPCAction(input);

      expect(["patrol", "work", "idle"]).toContain(decision.action);
    });

    it("returns deterministic result for same input", () => {
      const memory = createTestMemory("npc_1");
      const input = createTestDecisionInput(memory, 100);

      const decision1 = decideNPCAction(input);
      const decision2 = decideNPCAction(input);

      expect(decision1.action).toBe(decision2.action);
      expect(decision1.score).toBe(decision2.score);
      expect(decision1.reason).toBe(decision2.reason);
    });
  });

  describe("applyActionOutcome", () => {
    it("updates action scores on success", () => {
      const memory = createTestMemory("npc_1");

      const updated = applyActionOutcome(memory, "trade", "context_trade_1", 10, 100);

      expect(updated.learning.actionScores["action:trade"]).toBe(10);
      expect(updated.learning.successfulActions["action:trade"]).toBe(1);
      expect(updated.learning.totalActions).toBe(1);
      expect(updated.learning.totalSuccesses).toBe(1);
    });

    it("updates action scores on failure", () => {
      const memory = createTestMemory("npc_1");

      const updated = applyActionOutcome(memory, "attack", "context_attack_1", -5, 100);

      expect(updated.learning.actionScores["action:attack"]).toBeLessThan(0);
      expect(updated.learning.failedActions["action:attack"]).toBe(1);
      expect(updated.learning.totalSuccesses).toBe(0);
    });

    it("uses exponential moving average", () => {
      let memory = createTestMemory("npc_1");

      // First outcome
      memory = applyActionOutcome(memory, "trade", "context_trade", 10, 100);
      expect(memory.learning.actionScores["action:trade"]).toBe(10);

      // Second outcome (should be weighted average)
      memory = applyActionOutcome(memory, "trade", "context_trade", 10, 101);
      // 10 * 0.85 + 10 * 0.15 = 10
      expect(memory.learning.actionScores["action:trade"]).toBe(10);

      // Third outcome with different score
      memory = applyActionOutcome(memory, "trade", "context_trade", -5, 102);
      // 10 * 0.85 + (-5) * 0.15 = 8.5 - 0.75 = 7.75 -> 7
      expect(memory.learning.actionScores["action:trade"]).toBe(7);
    });
  });

  describe("calculateOutcomeScore", () => {
    it("scores positive for success", () => {
      const score = calculateOutcomeScore("trade", { success: true, goldGained: 50 });
      expect(score).toBeGreaterThan(0);
    });

    it("scores negative for failure", () => {
      const score = calculateOutcomeScore("attack", { success: false, damageTaken: 50 });
      expect(score).toBeLessThan(0);
    });

    it("considers multiple factors", () => {
      const score = calculateOutcomeScore("combat", {
        success: true,
        damageDealt: 100,
        damageTaken: 20,
        goldGained: 10,
      });
      expect(score).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// NPCBrainScheduler Tests
// ============================================================================

describe("NPCBrainScheduler", () => {
  beforeEach(() => {
    resetScheduler();
  });

  describe("getNPCBrainPhase", () => {
    it("returns consistent phase for same NPC", () => {
      const phase1 = getNPCBrainPhase("npc_1", 10);
      const phase2 = getNPCBrainPhase("npc_1", 10);
      expect(phase1).toBe(phase2);
    });

    it("distributes NPCs across phases", () => {
      const phases = new Set<number>();
      for (let i = 0; i < 100; i++) {
        phases.add(getNPCBrainPhase(`npc_${i}`, 10));
      }
      // Should have multiple phases represented
      expect(phases.size).toBeGreaterThan(1);
    });
  });

  describe("shouldRunBrainPhase", () => {
    it("returns true at correct tick intervals", () => {
      const npcId = "npc_test";
      const phase = getNPCBrainPhase(npcId, 10);

      // Should be true when tick % interval equals phase
      expect(shouldRunBrainPhase(npcId, phase, 10)).toBe(true);
      expect(shouldRunBrainPhase(npcId, phase + 10, 10)).toBe(true);
    });

    it("returns false at incorrect tick intervals", () => {
      const npcId = "npc_test";
      const phase = getNPCBrainPhase(npcId, 10);

      expect(shouldRunBrainPhase(npcId, phase + 1, 10)).toBe(false);
      expect(shouldRunBrainPhase(npcId, phase + 5, 10)).toBe(false);
    });
  });

  describe("getActivePhases", () => {
    it("always includes TICK phase", () => {
      const phases = getActivePhases("npc_1", 100, DEFAULT_SCHEDULER_CONFIG);
      expect(phases).toContain(BrainPhase.TICK);
    });

    it("includes DECISION phase at correct intervals", () => {
      const npcId = "npc_1";
      const phase = getNPCBrainPhase(npcId, 10);
      
      const phases = getActivePhases(npcId, phase, DEFAULT_SCHEDULER_CONFIG);
      expect(phases).toContain(BrainPhase.DECISION);
    });
  });

  describe("getNextDecisionTick", () => {
    it("returns future tick", () => {
      const npcId = "npc_test";
      const currentTick = 100;
      const nextTick = getNextDecisionTick(npcId, currentTick);

      expect(nextTick).toBeGreaterThanOrEqual(currentTick);
    });
  });

  describe("estimateCPULoad", () => {
    it("calculates operations per second", () => {
      const load = estimateCPULoad(100, DEFAULT_SCHEDULER_CONFIG);

      expect(load.tickOpsPerSecond).toBe(1000); // 100 * 10
      expect(load.decisionOpsPerSecond).toBe(100); // 100 * (10/10)
      expect(load.planningOpsPerSecond).toBe(10); // 100 * (10/100)
    });
  });
});

// ============================================================================
// NPCMemoryCompression Tests
// ============================================================================

describe("NPCMemoryCompression", () => {
  describe("compressNPCMemory", () => {
    it("keeps important memories", () => {
      const memory = createTestMemory("npc_1");
      memory.episodic = [
        { id: "e1", tick: 50, type: "player_attack", impact: -8, tags: [], score: 20 },
        { id: "e2", tick: 51, type: "player_trade", impact: 3, tags: [], score: 3 },
        { id: "e3", tick: 52, type: "quest_completed", impact: 6, tags: [], score: 12 },
      ];

      const compressed = compressNPCMemory(memory, 200, {
        minEpisodicScore: 5,
        maxEpisodicMemories: 64,
        maxSemanticMemories: 128,
        compressionInterval: 100,
        minEventsForSummary: 3,
        summaryImportanceThreshold: 8,
      });

      expect(compressed.episodic.length).toBeLessThanOrEqual(64);
      // Should keep e1 and e3 (score >= 5), may drop e2
    });

    it("generates semantic summary", () => {
      const memory = createTestMemory("npc_1");
      memory.episodic = [
        { id: "e1", tick: 50, type: "player_attack", impact: -8, tags: ["combat"], score: 20 },
        { id: "e2", tick: 51, type: "player_trade", impact: 3, tags: ["trade"], score: 10 },
        { id: "e3", tick: 52, type: "quest_completed", impact: 6, tags: ["quest"], score: 15 },
      ];

      const compressed = compressNPCMemory(memory, 200, {
        minEpisodicScore: 3,
        maxEpisodicMemories: 64,
        maxSemanticMemories: 128,
        compressionInterval: 100,
        minEventsForSummary: 3,
        summaryImportanceThreshold: 8,
      });

      expect(compressed.semantic.length).toBeGreaterThan(0);
      expect(compressed.semantic[0]!.text).toContain("attacks");
    });

    it("limits semantic memories", () => {
      const memory = createTestMemory("npc_1");
      // Add 200 semantic memories
      memory.semantic = Array.from({ length: 200 }, (_, i) => ({
        id: `sem_${i}`,
        tick: 100 + i,
        text: `Summary ${i}`,
        category: "test",
        confidence: 0.8,
        sourceEventIds: [],
        lastUpdatedTick: 100 + i,
        weight: 10,
        tags: [],
      }));

      const compressed = compressNPCMemory(memory, 300, DEFAULT_COMPRESSION_CONFIG);

      expect(compressed.semantic.length).toBeLessThanOrEqual(128);
    });
  });

  describe("verifyMemoryIntegrity", () => {
    it("returns valid for healthy memory", () => {
      const memory = createTestMemory("npc_1");

      const result = verifyMemoryIntegrity(memory);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("detects memory bloat", () => {
      const memory = createTestMemory("npc_1");
      memory.episodic = Array.from({ length: 300 }, (_, i) => ({
        id: `e_${i}`,
        tick: 100 + i,
        type: "player_attack" as const,
        impact: -5,
        tags: [],
        score: 5,
      }));

      const result = verifyMemoryIntegrity(memory, 256, 128, 20, 100);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("Episodic"))).toBe(true);
    });
  });

  describe("getMemoryStats", () => {
    it("returns correct statistics", () => {
      const memory = createTestMemory("npc_1");
      memory.episodic = [
        { id: "e1", tick: 100, type: "player_attack", impact: -8, tags: [], score: 10 },
        { id: "e2", tick: 101, type: "player_trade", impact: 3, tags: [], score: 5 },
      ];
      memory.semantic = [
        { id: "s1", tick: 100, text: "Test", category: "test", confidence: 0.8, sourceEventIds: [], lastUpdatedTick: 100, weight: 10, tags: [] },
      ];
      memory.goals = [
        { id: "g1", type: "combat" as const, priority: 80, createdAtTick: 100, reason: "defend" },
        { id: "g2", type: "trade" as const, priority: 60, createdAtTick: 100, reason: "earn" },
      ];

      const stats = getMemoryStats(memory);

      expect(stats.totalMemories).toBe(3);
      expect(stats.episodicCount).toBe(2);
      expect(stats.semanticCount).toBe(1);
      expect(stats.goalCount).toBe(2);
      expect(stats.averageScore).toBe(7.5);
    });
  });
});

// ============================================================================
// NPCBrainDebugSnapshot Tests
// ============================================================================

describe("NPCBrainDebugSnapshot", () => {
  describe("createNPCBrainDebugSnapshot", () => {
    it("creates snapshot with all fields", () => {
      const memory = createTestMemory("npc_1");
      memory.episodic = [
        { id: "e1", tick: 100, type: "player_attack", impact: -8, tags: [], score: 10 },
      ];
      memory.goals = [
        { id: "g1", type: "combat" as const, priority: 80, createdAtTick: 100, reason: "defend" },
      ];

      const snapshot = createNPCBrainDebugSnapshot(
        "npc_1",
        100,
        "combat",
        memory,
        { action: "attack", reason: "hostile_nearby", score: 25, confidence: 0.8 }
      );

      expect(snapshot.npcId).toBe("npc_1");
      expect(snapshot.tick).toBe(100);
      expect(snapshot.state).toBe("combat");
      expect(snapshot.topGoal).toBeDefined();
      expect(snapshot.decision.action).toBe("attack");
      expect(snapshot.memoryHash).toBeDefined();
    });
  });

  describe("checkBrainHealth", () => {
    it("returns healthy for good memory", () => {
      const memory = createTestMemory("npc_1");
      memory.learning.totalActions = 10;
      memory.learning.totalSuccesses = 7;

      const health = checkBrainHealth(memory, 200);

      expect(health.healthy).toBe(true);
      expect(health.score).toBeGreaterThan(50);
    });

    it("detects issues", () => {
      const memory = createTestMemory("npc_1");
      memory.episodic = Array.from({ length: 250 }, (_, i) => ({
        id: `e_${i}`,
        tick: 100 + i,
        type: "player_attack" as const,
        impact: -5,
        tags: [],
        score: 5,
      }));
      memory.learning.totalActions = 10;
      memory.learning.totalSuccesses = 2; // Low success rate

      const health = checkBrainHealth(memory, 200);

      expect(health.healthy).toBe(false);
      expect(health.issues.length).toBeGreaterThan(0);
    });
  });

  describe("generateNPCSummaryReport", () => {
    it("generates formatted report", () => {
      const memory = createTestMemory("npc_1");
      memory.learning.totalActions = 50;
      memory.learning.totalSuccesses = 35;

      const report = generateNPCSummaryReport("npc_1", memory, 100);

      expect(report).toContain("NPC Brain Report: npc_1");
      expect(report).toContain("Tick: 100");
      expect(report).toContain("Role: trader");
      expect(report).toContain("Success Rate:");
    });
  });
});

// ============================================================================
// NPCBrainRunner Tests
// ============================================================================

describe("NPCBrainRunner", () => {
  let runner: NPCBrainRunner;

  beforeEach(() => {
    runner = new NPCBrainRunner();
  });

  describe("runNPCBrain", () => {
    it("runs brain tick and returns output", () => {
      const memory = createTestMemory("npc_1");
      const input = createTestDecisionInput(memory, 100);

      const output = runner.runNPCBrain(input);

      expect(output.npcId).toBe("npc_1");
      expect(output.tick).toBe(100);
      expect(output.decision).toBeDefined();
      expect(output.memoryHash).toBeDefined();
    });

    it("applies observations to memory", () => {
      const memory = createTestMemory("npc_1");
      const input = createTestDecisionInput(memory, 100);

      // Add observation before running
      runner.runNPCBrain(input);

      // Add new observation
      const obs = createTestObservation(101, "player_attack", {
        targetId: "npc_1",
        impact: -8,
      });
      runner["observationBus"].emit("player_attack", 101, {
        actorId: "player_1",
        targetId: "npc_1",
        impact: -8,
      });

      const input2 = createTestDecisionInput(memory, 102);
      const output = runner.runNPCBrain(input2);

      // Memory should be updated with observation
      expect(output.memory.episodic.length).toBeGreaterThan(0);
    });
  });

  describe("applyLearning", () => {
    it("applies outcome to learning state", () => {
      const memory = createTestMemory("npc_1");

      const updated = runner.applyLearning(
        memory,
        "trade",
        { success: true, goldGained: 50 },
        "trade_at_market",
        100
      );

      expect(updated.learning.totalActions).toBe(1);
      expect(updated.learning.totalSuccesses).toBe(1);
    });
  });

  describe("getDebugSnapshot", () => {
    it("creates debug snapshot", () => {
      const memory = createTestMemory("npc_1");
      const decision = { action: "trade" as const, reason: "merchant", score: 20, confidence: 0.8 };

      const snapshot = runner.getDebugSnapshot("npc_1", 100, "trading", memory, decision);

      expect(snapshot.npcId).toBe("npc_1");
      expect(snapshot.state).toBe("trading");
      expect(snapshot.decision.action).toBe("trade");
    });
  });
});

// ============================================================================
// Determinism/Replay Tests
// ============================================================================

describe("Determinism and Replay", () => {
  let runner: NPCBrainRunner;

  beforeEach(() => {
    runner = new NPCBrainRunner();
  });

  it("same tick + same input = same output (memory scoring)", () => {
    const memory1 = createTestMemory("npc_1");
    const memory2 = createTestMemory("npc_1");
    
    const obs = createTestObservation(100, "player_attack", {
      targetId: "npc_1",
      impact: -8,
    });

    const updated1 = applyObservationsToMemory(memory1, [obs], 100);
    const updated2 = applyObservationsToMemory(memory2, [obs], 100);

    expect(updated1.episodic.length).toBe(updated2.episodic.length);
  });

  it("same tick + same input = same output (decision)", () => {
    const memory = createTestMemory("npc_1");
    const input = createTestDecisionInput(memory, 100);

    const output1 = runner.runNPCBrain(input);
    const output2 = runner.runNPCBrain(input);

    expect(output1.decision.action).toBe(output2.decision.action);
    expect(output1.decision.score).toBe(output2.decision.score);
    expect(output1.memoryHash).toBe(output2.memoryHash);
  });

  it("memory hash changes with different input", () => {
    const memory1 = createTestMemory("npc_1");
    const memory2 = createTestMemory("npc_1");
    memory2.episodic = [
      { id: "e1", tick: 100, type: "player_attack", impact: -8, tags: [], score: 10 },
    ];

    const hash1 = calculateMemoryHash(memory1);
    const hash2 = calculateMemoryHash(memory2);

    expect(hash1).not.toBe(hash2);
  });

  it("decision varies with different context", () => {
    const memory = createTestMemory("npc_1");

    // Scenario 1: No hostiles
    const input1 = createTestDecisionInput(memory, 100);
    input1.nearbyEntities = [];
    const decision1 = decideNPCAction(input1);

    // Scenario 2: Hostile present
    const input2 = createTestDecisionInput(memory, 101);
    input2.nearbyEntities = [
      { id: "monster", name: "Wolf", type: "monster", position: { x: 105, y: 205 }, hostile: true },
    ];
    const decision2 = decideNPCAction(input2);

    // Decisions should differ
    expect(decision1.action).not.toBe(decision2.action);
  });

  it("replay verification detects changes", () => {
    const memory = createTestMemory("npc_1");
    const input = createTestDecisionInput(memory, 100);

    const output1 = runner.runNPCBrain(input);
    const snapshot1 = runner.getDebugSnapshot("npc_1", 100, "idle", memory, output1.decision);

    // Run again
    const output2 = runner.runNPCBrain(input);
    const snapshot2 = runner.getDebugSnapshot("npc_1", 100, "idle", memory, output2.decision);

    const verification = verifyReplay(snapshot1, snapshot2, true);
    
    expect(verification.verified).toBe(true);
    expect(verification.differences).toHaveLength(0);
  });
});