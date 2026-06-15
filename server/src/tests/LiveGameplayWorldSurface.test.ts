import { describe, expect, it } from "vitest";
import {
  LiveGameplaySnapshotComposer,
  buildCivicStateFromWorldSurface,
} from "../gameplay/LiveGameplaySnapshotComposer.js";

function createComposer(overrides: Partial<ConstructorParameters<typeof LiveGameplaySnapshotComposer>[0]> = {}) {
  return new LiveGameplaySnapshotComposer({
    getInventoryItems: () => [],
    getEquipmentSlots: () => [],
    getSkillStates: () => [],
    getResourceNodes: () => [],
    getWallet: () => ({ coin: 0 }),
    ...overrides,
  });
}

describe("LiveGameplaySnapshotComposer worldSurface", () => {
  it("defaults to an empty deterministic world surface", async () => {
    const snapshot = await createComposer().compose("player_surface", 12);

    expect(snapshot.worldSurface).toEqual({
      schemaVersion: "world-surface-model.v1",
      tick: 0,
      groups: [],
      points: [],
    });
    expect(snapshot.civicState).toMatchObject({
      schemaVersion: "civic-state.v1",
      tick: 12,
      houseCount: 0,
      population: 0,
      capacity: 0,
      occupancyPermille: 0,
      pressure: "empty",
    });
  });

  it("includes server-authoritative world surface from deps", async () => {
    const snapshot = await createComposer({
      getWorldSurface: (_playerId, logicalIndex) => ({
        schemaVersion: "world-surface-model.v1",
        tick: logicalIndex,
        groups: [{ id: "house_1", kind: "lineage_house" }],
        points: [{ id: "lineage_1", kind: "lineage_node", x: 1, y: 2, z: 3 }],
      }),
    }).compose("player_surface", 42);

    expect(snapshot.worldSurface.tick).toBe(42);
    expect(snapshot.worldSurface.groups).toHaveLength(1);
    expect(snapshot.worldSurface.points).toHaveLength(1);
    expect(snapshot.civicState).toMatchObject({
      tick: 42,
      houseCount: 1,
      population: 1,
      capacity: 4,
      occupancyPermille: 250,
      pressure: "settled",
    });
  });

  it("replays the same civic state for the same inputs", () => {
    const surface = {
      schemaVersion: "world-surface-model.v1" as const,
      tick: 88,
      groups: [
        { id: "house_b", kind: "lineage_house" },
        { id: "house_a", kind: "lineage_house" },
      ],
      points: [
        { id: "lineage_b", kind: "lineage_node" },
        { id: "lineage_a", kind: "lineage_node" },
      ],
    };

    const first = buildCivicStateFromWorldSurface(88, surface);
    const replay = buildCivicStateFromWorldSurface(88, {
      ...surface,
      groups: [...surface.groups].reverse(),
      points: [...surface.points].reverse(),
    });

    expect(replay).toEqual(first);
    expect(first.civicHash.startsWith("civic:")).toBe(true);
  });

  it("reports pressure when population is greater than capacity", () => {
    const civicState = buildCivicStateFromWorldSurface(101, {
      schemaVersion: "world-surface-model.v1",
      tick: 101,
      groups: [{ id: "house_1", kind: "lineage_house" }],
      points: [
        { id: "lineage_1", kind: "lineage_node" },
        { id: "lineage_2", kind: "lineage_node" },
        { id: "lineage_3", kind: "lineage_node" },
        { id: "lineage_4", kind: "lineage_node" },
        { id: "lineage_5", kind: "lineage_node" },
      ],
    });

    expect(civicState).toMatchObject({
      houseCount: 1,
      population: 5,
      capacity: 4,
      occupancyPermille: 1250,
      pressure: "over_capacity",
    });
  });
});
