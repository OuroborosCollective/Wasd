import { describe, it, expect } from "vitest";
import { NPCMemoryCache, defaultHeuristicWeights } from "../modules/npc/NPCMemoryCache";
import { ChatChannelRouter } from "../modules/chat/ChatChannelRouter";
import { onTradeSuccess, onCombatWin, shouldChat } from "../modules/npc/NPCHeuristics";

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
