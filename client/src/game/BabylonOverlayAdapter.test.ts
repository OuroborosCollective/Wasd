import { describe, expect, it } from "vitest";
import {
  buildMinimapMarkersFromOverlay,
  overlayPoisToMinimapMarkers,
  overlayResourcesToMinimapMarkers,
  overlayCampNpcsToMinimapMarkers,
  overlaySurfacePointsTo3D,
  overlayStatusLabel,
  projectWorldToMinimap,
} from "./BabylonOverlayAdapter";
import type { WorldOverlayModel } from "@wasd/shared";

function makeModel(overrides: Partial<WorldOverlayModel> = {}): WorldOverlayModel {
  return {
    status: "live",
    evidence: {
      serverTick: 1,
      poiCount: 0,
      resourceCount: 0,
      campNpcCount: 0,
      surfaceGroupCount: 0,
      surfacePointCount: 0,
    },
    pois: [],
    resourceNodes: [],
    campNpcs: [],
    surfaceGroups: [],
    surfacePoints: [],
    worldSurfaceTick: 1,
    ...overrides,
  } as WorldOverlayModel;
}

describe("BabylonOverlayAdapter", () => {
  it("returns empty markers when model is blocked", () => {
    const model = makeModel({ status: "blocked" });
    expect(buildMinimapMarkersFromOverlay(model)).toEqual([]);
  });

  it("returns empty markers when model is waiting", () => {
    const model = makeModel({ status: "waiting" });
    expect(buildMinimapMarkersFromOverlay(model)).toEqual([]);
  });

  it("builds markers from POIs, resources, and camp NPCs", () => {
    const model = makeModel({
      pois: [{ poiId: "poi_1", type: "village", title: "V", x: 1, y: 2, chunkX: 0, chunkZ: 0, discovered: true }],
      resourceNodes: [{ id: "res_1", kind: "tree", title: "Oak", skillId: "woodcutting", x: 3, y: 4, radius: 16, status: "available" }],
      campNpcs: [{ id: "npc_1", type: "camp_woodcutter", name: "Alice", role: "Cutter", poiId: "poi_1", x: 5, y: 6, state: "idle", activity: "gathering", activityMessage: "" }],
    });
    const markers = buildMinimapMarkersFromOverlay(model);
    expect(markers).toHaveLength(3);
    expect(markers.map((m) => m.id)).toEqual(["camp_npc:npc_1", "poi:poi_1", "resource:res_1"]);
  });

  it("filters undiscovered POIs from minimap markers", () => {
    const model = makeModel({
      pois: [
        { poiId: "poi_a", type: "village", title: "A", x: 1, y: 2, chunkX: 0, chunkZ: 0, discovered: true },
        { poiId: "poi_b", type: "village", title: "B", x: 3, y: 4, chunkX: 0, chunkZ: 0, discovered: false },
      ],
    });
    const markers = overlayPoisToMinimapMarkers(model);
    expect(markers).toHaveLength(1);
    expect(markers[0].id).toBe("poi:poi_a");
  });

  it("filters depleted resources from minimap markers", () => {
    const model = makeModel({
      resourceNodes: [
        { id: "res_a", kind: "tree", title: "Oak", skillId: "woodcutting", x: 1, y: 2, radius: 16, status: "available" },
        { id: "res_b", kind: "tree", title: "Dead", skillId: "woodcutting", x: 3, y: 4, radius: 16, status: "depleted" },
      ],
    });
    const markers = overlayResourcesToMinimapMarkers(model);
    expect(markers).toHaveLength(1);
    expect(markers[0].id).toBe("resource:res_a");
  });

  it("projects surface points to 3D markers", () => {
    const model = makeModel({
      surfacePoints: [{ id: "sp_1", x: 7, y: 8, raw: {} }],
    });
    const points = overlaySurfacePointsTo3D(model);
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual({ id: "sp_1", x: 7, z: 8, raw: {} });
  });

  it("returns honest status labels", () => {
    expect(overlayStatusLabel(makeModel({ status: "live" }))).toBe("LIVE");
    expect(overlayStatusLabel(makeModel({ status: "waiting" }))).toBe("waiting");
    expect(overlayStatusLabel(makeModel({ status: "blocked" }))).toBe("blocked");
    expect(overlayStatusLabel(makeModel({ status: "stale" }))).toBe("stale");
    expect(overlayStatusLabel(makeModel({ status: "empty" }))).toBe("empty");
  });

  it("projects world position to minimap pixels centered on player", () => {
    const [px, py] = projectWorldToMinimap(10, 10, 0, 0, 220, 160, 1, 0);
    const expected = (160 / 2) / 220;
    expect(px).toBeCloseTo(10 * expected, 5);
    expect(py).toBeCloseTo(10 * expected, 5);
  });

  it("returns empty surface points when blocked", () => {
    const model = makeModel({ status: "blocked", surfacePoints: [{ id: "x", x: 1, y: 2, raw: {} }] });
    expect(overlaySurfacePointsTo3D(model)).toEqual([]);
  });
});
