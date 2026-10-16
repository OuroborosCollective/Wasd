/**
 * NPC Core & Cloning Performance Tests
 */

import { describe, expect, it } from "vitest";
import { NPC, type NPCData } from "../npc/NPC.js";
import { deepClone } from "../utils/deepClone.js";

function createSampleNPCData(): NPCData {
  return {
    name: "Ironclad Guard",
    state: "walking",
    stateTimer: 120,
    position: { x: 10, y: 0, z: 15 },
    hp: 100,
    maxHp: 100,
    factionId: "solaris",
    memory: {
      longTermGoals: ["patrol_gate", "protect_citizens"],
      knownPlayers: {
        player_1: { trust: 5, hostility: 0, lastSeenTick: 100 },
        player_2: { trust: -10, hostility: 20, lastSeenTick: 150 },
      },
    },
  };
}

describe("NPC class and cloning performance", () => {
  it("instantiates an NPC and maintains deep clone isolation", () => {
    const rawData = createSampleNPCData();
    const npc = new NPC("npc_1", rawData);

    // Mutate original object
    rawData.hp = 50;
    rawData.memory.longTermGoals.push("extra_goal");

    expect(npc.snapshot.hp).toBe(100);
    expect(npc.snapshot.memory.longTermGoals).toEqual(["patrol_gate", "protect_citizens"]);
  });

  it("handles tick, damage, and player memory correctly", () => {
    const npc = new NPC("npc_1", createSampleNPCData());

    npc.tick(10);
    expect(npc.snapshot.stateTimer).toBe(130);

    npc.rememberPlayer("player_3", { trust: 15, hostility: 0, lastSeenTick: 200 });
    expect(npc.snapshot.memory.knownPlayers.player_3).toEqual({
      trust: 15,
      hostility: 0,
      lastSeenTick: 200,
    });

    npc.damage(30);
    expect(npc.snapshot.hp).toBe(70);

    npc.damage(80);
    expect(npc.snapshot.hp).toBe(0);
    expect(npc.snapshot.state).toBe("dead");
  });

  it("serialize returns a deep clone of NPCData", () => {
    const npc = new NPC("npc_1", createSampleNPCData());
    const serialized = npc.serialize();

    expect(serialized).toEqual(createSampleNPCData());

    serialized.hp = 10;
    expect(npc.snapshot.hp).toBe(100);
  });

  it("benchmarks deepClone vs structuredClone for NPCData", () => {
    const sampleData = createSampleNPCData();
    const iterations = 50000;

    // 1. Benchmark structuredClone
    const startStructured = performance.now();
    for (let i = 0; i < iterations; i++) {
      structuredClone(sampleData);
    }
    const durationStructured = performance.now() - startStructured;

    // 2. Benchmark deepClone
    const startDeep = performance.now();
    for (let i = 0; i < iterations; i++) {
      deepClone(sampleData);
    }
    const durationDeep = performance.now() - startDeep;

    const speedup = durationStructured / durationDeep;

    console.log(`[NPC Benchmark] structuredClone: ${durationStructured.toFixed(2)}ms, deepClone: ${durationDeep.toFixed(2)}ms (${speedup.toFixed(2)}x speedup)`);

    expect(deepClone(sampleData)).toEqual(structuredClone(sampleData));
  });
});
