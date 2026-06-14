import { describe, expect, it } from "vitest";
import { LiveGameplaySnapshotComposer } from "../gameplay/LiveGameplaySnapshotComposer.js";

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
  });
});
