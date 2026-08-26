import { describe, expect, it } from "vitest";
import { OracleOuroborosConnector } from "../../../oracle/OracleOuroborosConnector.js";

function oracleVision() {
  return {
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
}

function observe(connector: OracleOuroborosConnector, events: readonly Record<string, unknown>[] = []) {
  return connector.observeOuroborosTick(
    1000,
    { getRecentEvents: () => events } as any,
    {} as any,
    {} as any,
    "are_hash",
  );
}

describe("OracleOuroborosConnector", () => {
  it("projects canonical world-history events into an observation", () => {
    const connector = new OracleOuroborosConnector();
    const observation = observe(connector, [
      { type: "war_declared", actorName: "Clan Iron", targetName: "Clan Fire", intensity: 0.95 },
      { type: "npc_mass_death", regionId: "north_plains", impactScore: 5, summary: "plague" },
      { type: "warfront_boss_active" },
    ]);

    expect(observation.factionWars).toEqual([{ factionA: "Clan Iron", factionB: "Clan Fire", intensity: 0.95 }]);
    expect(observation.npcMassDeaths).toEqual([{ regionId: "north_plains", cause: "plague", count: 50 }]);
    expect(observation).toMatchObject({ tick: 1000, stateHash: "are_hash", warfrontActive: true, warfrontPhase: "boss_active" });
  });

  it("synchronizes observations through the canonical Oracle endpoint", async () => {
    const connector = new OracleOuroborosConnector();
    const pulse = await connector.syncWithOracle(observe(connector));

    expect(pulse).toMatchObject({ tick: 1000, deterministic: true });
    expect(pulse.pulseHash).toMatch(/^are_[a-f0-9]+$/);
  });

  it("creates deterministic NPC visions and retains only the configured recent history", () => {
    const connector = new OracleOuroborosConnector({ maxVisionsPerNpc: 2 });
    const source = oracleVision();

    const first = connector.generateNPCVision("npc_1", source, 1000);
    connector.generateNPCVision("npc_1", { ...source, id: "vision_2", visionHash: "are_def456" }, 1001);
    const latest = connector.generateNPCVision("npc_1", { ...source, id: "vision_3", visionHash: "are_ghi789" }, 1002);

    expect(first).toMatchObject({ npcId: "npc_1", type: "warning", strength: 700, certainty: 800 });
    expect(connector.getNPCVisions("npc_1")).toEqual([expect.objectContaining({ tick: 1001 }), latest]);
  });

  it("drains pending visions without losing the stored per-NPC history", () => {
    const connector = new OracleOuroborosConnector();
    connector.generateNPCVision("npc_1", oracleVision(), 1000);

    expect(connector.getPendingVisions()).toHaveLength(1);
    expect(connector.getPendingVisions()).toEqual([]);
    expect(connector.getNPCVisions("npc_1")).toHaveLength(1);
  });

  it("routes a vision into supported memory and brain integration points", () => {
    const connector = new OracleOuroborosConnector();
    const vision = connector.generateNPCVision("npc_1", oracleVision(), 1000);
    const memories: unknown[] = [];
    const decisions: unknown[] = [];

    connector.injectVisionIntoNPCMemory("npc_1", vision, { addMemory: (memory: unknown) => memories.push(memory) } as any);
    connector.applyVisionToNPCBrain("npc_1", vision, { receiveOracleVision: (input: unknown) => decisions.push(input) } as any);

    expect(memories[0]).toEqual(expect.objectContaining({ type: "oracle_vision", tick: 1000 }));
    expect(decisions[0]).toEqual(expect.objectContaining({ npcId: "npc_1", visionId: vision.visionId }));
  });

  it("combines generated oracle analysis with civilization insights", () => {
    const connector = new OracleOuroborosConnector();
    const observation = observe(connector, [{ type: "war_declared", actorName: "A", targetName: "B", intensity: 1 }]);
    const result = connector.generatePropheticVisions(observation, [], [], []);

    expect(result.oracleVisions).toEqual([]);
    expect(result.dungeonProphecies).toEqual([]);
    expect(result.civilizationInsights).toEqual(["1 wars destabilize civilization."]);
  });
});
