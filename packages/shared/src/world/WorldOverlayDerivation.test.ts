import { describe, expect, it } from "vitest";
import {
  deriveWorldOverlayModelFromSnapshot,
  EMPTY_WORLD_OVERLAY_MODEL,
} from "./WorldOverlayDerivation";

describe("WorldOverlayDerivation", () => {
  it("returns empty waiting model for null/undefined input", () => {
    expect(deriveWorldOverlayModelFromSnapshot(null)).toBe(EMPTY_WORLD_OVERLAY_MODEL);
    expect(deriveWorldOverlayModelFromSnapshot(undefined)).toBe(EMPTY_WORLD_OVERLAY_MODEL);
  });

  it("reports blocked when snapshot is present but worldSurface is missing", () => {
    const model = deriveWorldOverlayModelFromSnapshot({
      status: "live",
      serverTick: 5,
      worldPois: [{ poiId: "poi_1", type: "village", title: "V", x: 1, y: 2, chunkX: 0, chunkZ: 0, discovered: true }],
    });
    expect(model.status).toBe("blocked");
    expect(model.evidence.poiCount).toBe(1);
  });

  it("derives live status with all entries from a full snapshot", () => {
    const model = deriveWorldOverlayModelFromSnapshot({
      status: "live",
      serverTick: 42,
      worldPois: [{ poiId: "poi_b", type: "camp", title: "B", x: 3, y: 4, chunkX: 0, chunkZ: 0, discovered: true }],
      resources: [{ id: "res_a", kind: "tree", title: "Oak", skillId: "woodcutting", position: { x: 1, y: 2 }, radius: 16, status: "available", requiredLevel: 1, xpReward: 5, itemRewardId: "oak", itemRewardName: "Oak", depletedUntilTick: null, remainingTicks: 0 }],
      campNpcs: [{ id: "npc_a", type: "camp_woodcutter", name: "Alice", role: "Cutter", poiId: "poi_b", position: { x: 1, y: 2 }, state: "idle", activity: "gathering", activityMessage: "" }],
      worldSurface: { schemaVersion: 1, tick: 7, groups: [{ id: "g1", title: "House" }], points: [{ id: "p1", x: 1, y: 2 }] },
    });
    expect(model.status).toBe("live");
    expect(model.evidence.serverTick).toBe(42);
    expect(model.pois).toHaveLength(1);
    expect(model.resourceNodes).toHaveLength(1);
    expect(model.campNpcs).toHaveLength(1);
    expect(model.surfaceGroups).toHaveLength(1);
    expect(model.surfacePoints).toHaveLength(1);
    expect(model.worldSurfaceTick).toBe(7);
  });

  it("reports live when the authoritative snapshot contains only worldSurface facts", () => {
    const model = deriveWorldOverlayModelFromSnapshot({
      status: "live",
      serverTick: 84,
      worldSurface: {
        tick: 84,
        groups: [{ id: "house:ember", title: "Ember House" }],
        points: [{ id: "lineage:ember:elder", x: 12, y: 17, houseId: "house:ember" }],
      },
    });
    expect(model.status).toBe("live");
    expect(model.evidence.surfaceGroupCount).toBe(1);
    expect(model.evidence.surfacePointCount).toBe(1);
  });

  it("filters out invalid resource kinds and camp NPC types", () => {
    const model = deriveWorldOverlayModelFromSnapshot({
      status: "live",
      worldSurface: { tick: 1, groups: [], points: [] },
      resources: [
        { id: "res_a", kind: "ore", skillId: "mining", position: { x: 0, y: 0 }, status: "available" },
        { id: "res_b", kind: "invalid", skillId: "mining", position: { x: 0, y: 0 }, status: "available" },
      ],
      campNpcs: [
        { id: "npc_a", type: "camp_miner", name: "Bob", role: "M", poiId: "", position: { x: 0, y: 0 }, state: "idle", activity: "gathering", activityMessage: "" },
        { id: "npc_b", type: "invalid", name: "Bad", role: "X", poiId: "", position: { x: 0, y: 0 }, state: "idle", activity: "gathering", activityMessage: "" },
      ],
    });
    expect(model.resourceNodes).toHaveLength(1);
    expect(model.campNpcs).toHaveLength(1);
  });

  it("sorts entries deterministically by id", () => {
    const model = deriveWorldOverlayModelFromSnapshot({
      status: "live",
      worldSurface: { tick: 1, groups: [], points: [] },
      worldPois: [
        { poiId: "poi_z", type: "village", title: "Z", x: 0, y: 0, chunkX: 0, chunkZ: 0, discovered: true },
        { poiId: "poi_a", type: "village", title: "A", x: 0, y: 0, chunkX: 0, chunkZ: 0, discovered: true },
        { poiId: "poi_m", type: "village", title: "M", x: 0, y: 0, chunkX: 0, chunkZ: 0, discovered: true },
      ],
    });
    expect(model.pois.map((p) => p.poiId)).toEqual(["poi_a", "poi_m", "poi_z"]);
  });

  it("treats undiscovered POIs as discovered=false", () => {
    const model = deriveWorldOverlayModelFromSnapshot({
      status: "live",
      worldSurface: { tick: 1, groups: [], points: [] },
      worldPois: [
        { poiId: "poi_a", type: "village", title: "A", x: 0, y: 0, chunkX: 0, chunkZ: 0, discovered: false },
      ],
    });
    expect(model.pois[0].discovered).toBe(false);
  });

  it("reports empty when status is unknown, surface present, but no entries", () => {
    const model = deriveWorldOverlayModelFromSnapshot({
      status: "live",
      worldSurface: { tick: 1, groups: [], points: [] },
    });
    expect(model.status).toBe("empty");
  });

  it("returns frozen model and evidence", () => {
    const model = deriveWorldOverlayModelFromSnapshot({
      status: "live",
      worldSurface: { tick: 1, groups: [], points: [] },
    });
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.evidence)).toBe(true);
    expect(Object.isFrozen(model.pois)).toBe(true);
  });
});
