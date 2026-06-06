import { describe, it, expect } from "vitest";
import { NPCMemoryCache, defaultHeuristicWeights } from "../modules/npc/NPCMemoryCache";
import { ChatChannelRouter } from "../modules/chat/ChatChannelRouter";
import { onTradeSuccess, onCombatWin, shouldChat } from "../modules/npc/NPCHeuristics";
import {
  // Types from npc.types.ts
  NPCState,
  NPCGoalType,
  NPCGoal,
  NPCLongTermGoal,
  NPCMemoryEvent,
  NPCRelation,
  NPCMemorySummary,
  NPCMemory,
  // Helper functions
  normalizeNPCGoal,
  compareNPCGoals,
  rememberNPCEvent,
  adjustNPCRelation,
  createNPCRelation,
  decideNPCState,
  createMemorySummary,
  filterGoalsByType,
  getTopGoal,
  generateGoalId,
} from "../types/npc.types";

describe("NPCMemoryCache", () => {
  it("creates default state for unknown NPC", () => {
    const cache = new NPCMemoryCache();
    const state = cache.get("npc_test");
    expect(state.npcId).toBe("npc_test");
    expect(state.currentGoal).toBe("idle");
    expect(state.heuristicWeights.aggression).toBe(0.5);
    expect(state.dirty).toBe(false);
  });

  it("tracks observations and marks dirty", () => {
    const cache = new NPCMemoryCache();
    cache.observe("npc_1", "Saw a player nearby");
    const s = cache.get("npc_1");
    expect(s.shortTermObservations).toHaveLength(1);
    expect(s.dirty).toBe(true);
  });

  it("records chat messages", () => {
    const cache = new NPCMemoryCache();
    cache.recordChat("npc_1", { text: "Hello", sender: "Player1", channel: "local", ts: Date.now() });
    expect(cache.get("npc_1").recentChatSeen).toHaveLength(1);
  });

  it("enforces cooldown", () => {
    const cache = new NPCMemoryCache();
    expect(cache.checkCooldown("npc_1", "chat", 5000)).toBe(true);
    expect(cache.checkCooldown("npc_1", "chat", 5000)).toBe(false);
  });

  it("hydrates from Supabase data", () => {
    const cache = new NPCMemoryCache();
    cache.hydrate("npc_1", {
      heuristicWeights: { aggression: 0.8, tradeWillingness: 0.9, partySeeking: 0.1, chatFrequency: 0.6, fleeThreshold: 0.2 },
      longTermGoals: ["guard_village"],
      tradeHistory: [{ itemId: "sword", price: 100, success: true, ts: 1 }],
    });
    const s = cache.get("npc_1");
    expect(s.heuristicWeights.aggression).toBe(0.8);
    expect(s.longTermGoals).toContain("guard_village");
    expect(s.tradeHistory).toHaveLength(1);
    expect(s.dirty).toBe(false);
  });

  it("updates reputation", () => {
    const cache = new NPCMemoryCache();
    cache.updateReputation("npc_1", "player_a", 10);
    cache.updateReputation("npc_1", "player_a", 5);
    const rep = cache.get("npc_1").reputation.find(r => r.playerId === "player_a");
    expect(rep?.score).toBe(15);
  });

  it("returns dirty entries", () => {
    const cache = new NPCMemoryCache();
    cache.observe("npc_1", "test");
    cache.get("npc_2"); // not dirty
    expect(cache.getDirtyEntries()).toHaveLength(1);
    expect(cache.getDirtyEntries()[0].npcId).toBe("npc_1");
  });
});

describe("NPCHeuristics", () => {
  it("increases tradeWillingness on successful trade", () => {
    const cache = new NPCMemoryCache();
    const before = cache.get("npc_1").heuristicWeights.tradeWillingness;
    onTradeSuccess(cache, "npc_1");
    expect(cache.get("npc_1").heuristicWeights.tradeWillingness).toBeGreaterThan(before);
  });

  it("increases aggression on combat win", () => {
    const cache = new NPCMemoryCache();
    const before = cache.get("npc_1").heuristicWeights.aggression;
    onCombatWin(cache, "npc_1");
    expect(cache.get("npc_1").heuristicWeights.aggression).toBeGreaterThan(before);
  });

  it("shouldChat is probabilistic (does not always fire)", () => {
    const cache = new NPCMemoryCache();
    let trueCount = 0;
    for (let i = 0; i < 100; i++) {
      if (shouldChat(cache, "npc_1")) trueCount++;
    }
    expect(trueCount).toBeGreaterThanOrEqual(0);
    expect(trueCount).toBeLessThan(100);
  });
});

describe("ChatChannelRouter", () => {
  it("publishes global messages to all via broadcast", () => {
    const router = new ChatChannelRouter();
    const broadcasts: unknown[] = [];
    const sent: Array<{ id: string; payload: unknown }> = [];

    const msg = router.publish(
      {
        channel: "global",
        senderType: "player",
        senderId: "p1",
        senderName: "Player1",
        text: "Hello world",
      },
      [{ id: "p1", position: { x: 0, y: 0 } }, { id: "p2", position: { x: 100, y: 100 } }],
      (sid, p) => sent.push({ id: sid, payload: p }),
      (p) => broadcasts.push(p),
      () => undefined,
    );

    expect(msg).not.toBeNull();
    expect(msg!.channel).toBe("global");
    expect(broadcasts).toHaveLength(1);
    expect(sent).toHaveLength(0);
  });

  it("publishes local messages only to nearby recipients", () => {
    const router = new ChatChannelRouter();
    const sent: Array<{ id: string; payload: unknown }> = [];

    router.publish(
      {
        channel: "local",
        senderType: "npc",
        senderId: "npc_1",
        senderName: "Guard",
        npcId: "npc_1",
        text: "Halt!",
        position: { x: 10, y: 10 },
      },
      [
        { id: "p_near", position: { x: 15, y: 15 } },
        { id: "p_far", position: { x: 200, y: 200 } },
      ],
      (sid, p) => sent.push({ id: sid, payload: p }),
      () => {},
      (pid) => pid,
    );

    expect(sent).toHaveLength(1);
    expect(sent[0].id).toBe("p_near");
  });

  it("rate-limits NPC messages", () => {
    const router = new ChatChannelRouter();
    router.setNpcCooldown(5000);

    const msg1 = router.publish(
      { channel: "local", senderType: "npc", senderId: "npc_1", senderName: "Guard", npcId: "npc_1", text: "First", position: { x: 0, y: 0 } },
      [], () => {}, () => {}, () => undefined,
    );
    const msg2 = router.publish(
      { channel: "local", senderType: "npc", senderId: "npc_1", senderName: "Guard", npcId: "npc_1", text: "Second", position: { x: 0, y: 0 } },
      [], () => {}, () => {}, () => undefined,
    );

    expect(msg1).not.toBeNull();
    expect(msg2).toBeNull();
  });

  it("emits status messages with proximity filtering", () => {
    const router = new ChatChannelRouter();
    const sent: string[] = [];

    router.emitStatus(
      "Monster spawned!",
      { x: 0, y: 0 },
      [
        { id: "p_near", position: { x: 5, y: 5 } },
        { id: "p_far", position: { x: 500, y: 500 } },
      ],
      (sid) => sent.push(sid),
      (pid) => pid,
    );

    expect(sent).toHaveLength(1);
    expect(sent[0]).toBe("p_near");
  });

  it("getRecentForPosition returns correct messages", () => {
    const router = new ChatChannelRouter();
    router.publish(
      { channel: "global", senderType: "player", senderId: "p1", senderName: "P1", text: "Global msg" },
      [], () => {}, () => {}, () => undefined,
    );
    router.publish(
      { channel: "local", senderType: "player", senderId: "p2", senderName: "P2", text: "Local msg", position: { x: 10, y: 10 } },
      [], () => {}, () => {}, () => undefined,
    );

    const nearby = router.getRecentForPosition({ x: 12, y: 12 }, 10);
    expect(nearby).toHaveLength(2);

    const farAway = router.getRecentForPosition({ x: 999, y: 999 }, 10);
    expect(farAway).toHaveLength(1);
    expect(farAway[0].channel).toBe("global");
  });
});

// ============================================================================
// NPC Types v2 Tests (Deterministic)
// ============================================================================

describe("NPC Types v2 - Deterministic Helpers", () => {
  describe("normalizeNPCGoal", () => {
    it("returns goal as-is if already structured", () => {
      const structuredGoal: NPCGoal = {
        id: "goal_123",
        type: "combat",
        priority: 90,
      };
      const result = normalizeNPCGoal(structuredGoal, "npc_1", 100);
      expect(result).toEqual(structuredGoal);
    });

    it("normalizes legacy string 'guard_village' to defend goal", () => {
      const result = normalizeNPCGoal("guard_village", "npc_1", 100);
      expect(result.type).toBe("defend");
      expect(result.priority).toBe(80);
      expect(result.reason).toContain("normalized_from_legacy");
    });

    it("normalizes legacy string 'collect_wood' to collect goal", () => {
      const result = normalizeNPCGoal("collect_wood", "npc_1", 100);
      expect(result.type).toBe("collect");
      expect(result.priority).toBe(70);
    });

    it("normalizes quest goals with high priority", () => {
      const result = normalizeNPCGoal("quest_main_deliver", "npc_1", 100);
      expect(result.type).toBe("quest_main");
      expect(result.priority).toBe(90);
    });

    it("normalizes flee goals with highest priority", () => {
      const result = normalizeNPCGoal("flee_from_danger", "npc_1", 100);
      expect(result.type).toBe("flee");
      expect(result.priority).toBe(95);
    });

    it("normalizes unknown goals with default priority", () => {
      const result = normalizeNPCGoal("some_random_goal", "npc_1", 100);
      expect(result.type).toBe("idle");
      expect(result.priority).toBe(50);
    });
  });

  describe("compareNPCGoals", () => {
    it("sorts by priority descending", () => {
      const goals: NPCLongTermGoal[] = [
        { id: "a", type: "idle", priority: 30 },
        { id: "b", type: "combat", priority: 90 },
        { id: "c", type: "collect", priority: 60 },
      ];
      const sorted = [...goals].sort(compareNPCGoals);
      expect(sorted[0]!.priority).toBe(90);
      expect(sorted[1]!.priority).toBe(60);
      expect(sorted[2]!.priority).toBe(30);
    });

    it("handles mixed string and structured goals", () => {
      const goals: NPCLongTermGoal[] = [
        "guard_village", // normalized to priority 80
        { id: "combat_goal", type: "combat", priority: 90 },
      ];
      const sorted = [...goals].sort(compareNPCGoals);
      expect(sorted[0]).toEqual({ id: "combat_goal", type: "combat", priority: 90 });
    });
  });

  describe("rememberNPCEvent", () => {
    it("creates deterministic event with tick", () => {
      const event = rememberNPCEvent("npc_1", "combat_win", "Defeated player", 500);
      expect(event.npcId).toBe("npc_1");
      expect(event.tick).toBe(500);
      expect(event.kind).toBe("combat_win");
      expect(event.id).toContain("npc_1");
    });

    it("includes tags and data", () => {
      const event = rememberNPCEvent(
        "npc_1",
        "trade_success",
        "Sold sword",
        200,
        ["trade", "economy"],
        { itemId: "sword", price: 100 }
      );
      expect(event.tags).toEqual(["trade", "economy"]);
      expect(event.data).toEqual({ itemId: "sword", price: 100 });
    });
  });

  describe("adjustNPCRelation", () => {
    it("increases score with positive delta", () => {
      const relation = createNPCRelation("player_1", "player");
      const adjusted = adjustNPCRelation(relation, 20, 100, "positive");
      expect(adjusted.score).toBe(20);
      expect(adjusted.trust).toBe(55); // 50 + 5
      expect(adjusted.interactions).toBe(1);
    });

    it("decreases score with negative delta", () => {
      const relation = createNPCRelation("player_1", "player");
      const adjusted = adjustNPCRelation(relation, -30, 100, "negative");
      expect(adjusted.score).toBe(-30);
      expect(adjusted.trust).toBe(45); // 50 - 5
    });

    it("clamps score to [-100, 100]", () => {
      const relation = createNPCRelation("player_1", "player");
      const adjusted = adjustNPCRelation(relation, 200, 100);
      expect(adjusted.score).toBe(100);
    });

    it("updates lastInteractionTick", () => {
      const relation = createNPCRelation("player_1", "player");
      const adjusted = adjustNPCRelation(relation, 10, 500);
      expect(adjusted.lastInteractionTick).toBe(500);
    });
  });

  describe("decideNPCState", () => {
    it("returns combat when inCombat is true", () => {
      const state = decideNPCState("idle", [], true, false, 80);
      expect(state).toBe("combat");
    });

    it("returns idle when health is critical", () => {
      const state = decideNPCState("wandering", [], false, false, 10);
      expect(state).toBe("idle");
    });

    it("returns collecting for collect goals", () => {
      const goals: NPCLongTermGoal[] = [{ id: "g1", type: "collect", priority: 70 }];
      const state = decideNPCState("idle", goals, false, false, 80);
      expect(state).toBe("collecting");
    });

    it("returns trading for trade goals", () => {
      const goals: NPCLongTermGoal[] = [{ id: "g1", type: "trade", priority: 65 }];
      const state = decideNPCState("idle", goals, false, false, 80);
      expect(state).toBe("trading");
    });

    it("returns social when inSocial and social goal", () => {
      const goals: NPCLongTermGoal[] = [{ id: "g1", type: "social", priority: 45 }];
      const state = decideNPCState("idle", goals, false, true, 80);
      expect(state).toBe("social");
    });
  });

  describe("createMemorySummary", () => {
    it("creates summary with correct counts", () => {
      const goals: NPCLongTermGoal[] = [
        { id: "g1", type: "combat", priority: 90 },
        { id: "g2", type: "collect", priority: 70 },
      ];
      const relations: NPCRelation[] = [
        { entityId: "p1", entityType: "player", score: 50, interactions: 5, lastInteractionTick: 100, trust: 70 },
      ];
      const events: NPCMemoryEvent[] = [
        { id: "e1", npcId: "npc_1", kind: "combat_win", tick: 95, content: "won", tags: [] },
      ];
      
      const summary = createMemorySummary("npc_1", 100, goals, relations, events);
      expect(summary.npcId).toBe("npc_1");
      expect(summary.goalCount).toBe(2);
      expect(summary.relationCount).toBe(1);
      expect(summary.recentEventCount).toBe(1);
      expect(summary.dominantMood).toBe("friendly");
    });
  });

  describe("filterGoalsByType", () => {
    it("filters to specific goal types", () => {
      const goals: NPCLongTermGoal[] = [
        { id: "g1", type: "combat", priority: 90 },
        { id: "g2", type: "collect", priority: 70 },
        { id: "g3", type: "trade", priority: 65 },
      ];
      const filtered = filterGoalsByType(goals, ["combat", "survive"]);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toEqual({ id: "g1", type: "combat", priority: 90 });
    });

    it("normalizes string goals before filtering", () => {
      const goals: NPCLongTermGoal[] = [
        "guard_village", // normalized to defend
        { id: "g1", type: "combat", priority: 90 },
      ];
      const filtered = filterGoalsByType(goals, ["defend"]);
      expect(filtered).toHaveLength(1);
    });
  });

  describe("getTopGoal", () => {
    it("returns highest priority goal", () => {
      const goals: NPCLongTermGoal[] = [
        { id: "g1", type: "idle", priority: 30 },
        { id: "g2", type: "combat", priority: 90 },
        { id: "g3", type: "collect", priority: 60 },
      ];
      const top = getTopGoal(goals);
      expect(top).toEqual({ id: "g2", type: "combat", priority: 90 });
    });

    it("returns undefined for empty array", () => {
      expect(getTopGoal([])).toBeUndefined();
    });
  });

  describe("generateGoalId", () => {
    it("generates deterministic ID from components", () => {
      const id1 = generateGoalId("npc_1", "combat", 100);
      const id2 = generateGoalId("npc_1", "combat", 100);
      expect(id1).toBe(id2); // Deterministic
      expect(id1).toMatch(/^goal_[a-f0-9]+$/);
    });

    it("generates different IDs for different inputs", () => {
      const id1 = generateGoalId("npc_1", "combat", 100);
      const id2 = generateGoalId("npc_1", "collect", 100);
      expect(id1).not.toBe(id2);
    });
  });

  describe("Legacy Compatibility", () => {
    it("NPCMemory supports legacy string[] format", () => {
      const legacyMemory: NPCMemory = {
        longTermGoals: ["guard_village", "collect_wood"],
        events: [],
        relations: [],
        summary: {
          npcId: "npc_1",
          lastTick: 100,
          goalCount: 2,
          relationCount: 0,
          recentEventCount: 0,
        },
      };
      expect(legacyMemory.longTermGoals).toHaveLength(2);
      expect(legacyMemory.longTermGoals[0]).toBe("guard_village");
    });

    it("normalizeNPCGoal handles legacy strings correctly", () => {
      const goals = ["guard_village", "collect_wood", "trade_goods"];
      const normalized = goals.map(g => normalizeNPCGoal(g, "npc_1", 100));
      expect(normalized[0]!.type).toBe("defend");
      expect(normalized[1]!.type).toBe("collect");
      expect(normalized[2]!.type).toBe("trade");
    });
  });
});
