import { describe, it, expect } from "vitest";
import { NPC, NPCData } from "../npc/NPC";
import { deepClone } from "../utils/deepClone";

describe("NPC unit and benchmark tests", () => {
  const sampleData: NPCData = {
    name: "Elder Aldrin",
    state: "idle",
    stateTimer: 12,
    position: { x: 100, y: 50, z: 12 },
    hp: 100,
    maxHp: 100,
    factionId: "faction_guardians",
    memory: {
      longTermGoals: ["protect_village", "trade_herbs"],
      knownPlayers: {
        player_1: { trust: 10, hostility: 0, lastSeenTick: 500 },
        player_2: { trust: -5, hostility: 20, lastSeenTick: 550 },
      },
    },
  };

  it("correctly instantiates and maintains independent data copies", () => {
    const npc = new NPC("npc_aldrin", sampleData);
    expect(npc.id).toBe("npc_aldrin");
    expect(npc.snapshot.name).toBe("Elder Aldrin");
    expect(npc.snapshot.state).toBe("idle");

    // Ensure constructor cloned input data so mutations on sampleData don't affect npc
    const modifiedSample = { ...sampleData, hp: 50 };
    expect(npc.snapshot.hp).toBe(100);

    const serialized = npc.serialize();
    expect(serialized).toEqual(sampleData);
    expect(serialized).not.toBe(npc.snapshot); // ensure new copy
  });

  it("handles tick, state transitions, damage, and player memory", () => {
    const npc = new NPC("npc_aldrin", sampleData);

    npc.tick(5);
    expect(npc.snapshot.stateTimer).toBe(17);

    npc.damage(30);
    expect(npc.snapshot.hp).toBe(70);
    expect(npc.snapshot.state).toBe("idle");

    npc.setState("fighting");
    expect(npc.snapshot.state).toBe("fighting");
    expect(npc.snapshot.stateTimer).toBe(0);

    npc.rememberPlayer("player_1", { trust: 15 });
    expect(npc.snapshot.memory.knownPlayers.player_1.trust).toBe(15);
    expect(npc.snapshot.memory.knownPlayers.player_1.hostility).toBe(0);

    npc.damage(100);
    expect(npc.snapshot.hp).toBe(0);
    expect(npc.snapshot.state).toBe("dead");

    npc.tick(10); // Dead NPCs should not advance state timer
    expect(npc.snapshot.stateTimer).toBe(0);
  });

  it("benchmarks performance speedup of deepClone vs structuredClone for NPC data", () => {
    const ITERATIONS = 20_000;

    // 1. Benchmark structuredClone
    const startStructured = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
      structuredClone(sampleData);
    }
    const durationStructured = performance.now() - startStructured;

    // 2. Benchmark deepClone
    const startDeep = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
      deepClone(sampleData);
    }
    const durationDeep = performance.now() - startDeep;

    const speedup = durationStructured / durationDeep;

    console.log(`[NPC Benchmark ${ITERATIONS} iterations]`);
    console.log(`  - structuredClone: ${durationStructured.toFixed(2)}ms`);
    console.log(`  - deepClone:       ${durationDeep.toFixed(2)}ms (${speedup.toFixed(2)}x speedup)`);

    expect(durationDeep).toBeLessThan(durationStructured);
  });
});
