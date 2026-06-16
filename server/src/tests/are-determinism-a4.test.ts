import { describe, expect, it } from "vitest";
import { AREPayload, type INPCState } from "../engine/core/AREPayload";
import { AREStateCompiler, type NPC, type WorldState } from "../logic/AREStateCompiler";

function createNpc(id: string, profile = "Villager", legendSpreadChance = 0): NPC {
  return {
    id,
    profile,
    genealogy: {
      lineage: [`lineage-${id}`],
      generation: 1,
      mutations: [],
    },
    stats: {
      legendSpreadChance,
      integrity: 1000,
    },
  };
}

function createNpcState(id: string, status = 1): INPCState {
  return {
    id,
    v: [0, 0, 0],
    r: 0,
    s: status,
    h: 100,
    a: 0,
    p: {},
  };
}

function createWorldState(entries: Array<[string, NPC]>): WorldState {
  return {
    version: 7,
    checksum: "chunk:7:13:kappa1000",
    npcs: new Map(entries),
  };
}

describe("A4 determinism runtime fixes", () => {
  it("derives ARE payload timestamps from the logical tick", () => {
    const payloadA = new AREPayload(42, [
      createNpcState("npc_b"),
      createNpcState("npc_void", 0),
      createNpcState("npc_a"),
    ]);
    const payloadB = new AREPayload(42, [
      createNpcState("npc_a"),
      createNpcState("npc_b"),
      createNpcState("npc_void", 0),
    ]);

    expect(payloadA.timestamp).toBe(4200);
    expect(payloadA.serialize()).toBe(payloadB.serialize());
    expect(Object.keys(AREPayload.deserialize(payloadA.serialize()).en)).toEqual(["npc_a", "npc_b"]);
  });

  it("creates repeatable delta snapshots without wall-clock entropy", async () => {
    const worldA = createWorldState([
      ["npc_b", createNpc("npc_b")],
      ["npc_a", createNpc("npc_a")],
    ]);
    const worldB = createWorldState([
      ["npc_a", createNpc("npc_a")],
      ["npc_b", createNpc("npc_b")],
    ]);

    const compilerA = new AREStateCompiler();
    const compilerB = new AREStateCompiler();

    const snapshotA = await compilerA.createDeltaSnapshot(worldA);
    const snapshotB = await compilerB.createDeltaSnapshot(worldB);

    expect(snapshotA.timestamp).toBe(100);
    expect(snapshotA.integrityHash).toBe(snapshotB.integrityHash);
    expect(snapshotA.upserted.map((npc) => npc.id)).toEqual(["npc_a", "npc_b"]);

    const secondA = await compilerA.createDeltaSnapshot(worldA);
    const secondB = await compilerB.createDeltaSnapshot(worldB);

    expect(secondA.timestamp).toBe(200);
    expect(secondA.upserted).toHaveLength(0);
    expect(secondA.integrityHash).toBe(secondB.integrityHash);
  });

  it("orders genealogy mutations by NPC id with tick-derived event timestamps", async () => {
    const compiler = new AREStateCompiler();
    const npcA = createNpc("npc_a", "Scholar", 1000);
    const npcB = createNpc("npc_b", "Farmer", 1000);
    const events: Array<{ id: string; timestamp: number }> = [];

    compiler.on("npcEvolved", (event: { id: string; timestamp: number }) => {
      events.push(event);
    });

    compiler.triggerGenealogyUpdate([npcB, npcA], 500);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(events.map((event) => event.id)).toEqual(["npc_a", "npc_b"]);
    expect(events.map((event) => event.timestamp)).toEqual([100, 200]);
    expect(npcA.genealogy.mutations).toEqual(["LEGEND_SPREAD_THRESHOLD_REACHED_1"]);
    expect(npcB.genealogy.mutations).toEqual(["LEGEND_SPREAD_THRESHOLD_REACHED_2"]);
  });
});
