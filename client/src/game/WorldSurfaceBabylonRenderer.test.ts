import { NullEngine, Scene } from "@babylonjs/core";
import { deriveWorldOverlayModelFromSnapshot } from "@wasd/shared";
import { describe, expect, it } from "vitest";
import { WorldSurfaceBabylonRenderer } from "./WorldSurfaceBabylonRenderer";

function createAuthoritativeSurfaceModel() {
  return deriveWorldOverlayModelFromSnapshot({
    status: "live",
    serverTick: 84,
    worldSurface: {
      tick: 84,
      groups: [{ id: "house:ember", title: "Ember House" }],
      points: [
        { id: "lineage:ember:elder", x: 12, y: 17, houseId: "house:ember" },
      ],
    },
  });
}

function createEmptyAuthoritativeSurfaceModel() {
  return deriveWorldOverlayModelFromSnapshot({
    status: "live",
    serverTick: 85,
    worldSurface: { tick: 85, groups: [], points: [] },
  });
}

function createBlockedAuthoritativeSurfaceModel() {
  return deriveWorldOverlayModelFromSnapshot({
    status: "live",
    serverTick: 86,
  });
}

describe("WorldSurfaceBabylonRenderer", () => {
  it("projects server-derived groups and points into real Babylon meshes and removes them for empty or blocked facts", () => {
    const engine = new NullEngine({
      renderWidth: 64,
      renderHeight: 64,
      textureSize: 64,
      deterministicLockstep: true,
      lockstepMaxSteps: 4,
    });
    const scene = new Scene(engine);
    const renderer = new WorldSurfaceBabylonRenderer(scene);

    try {
      const liveModel = createAuthoritativeSurfaceModel();
      expect(liveModel.status).toBe("live");
      renderer.apply(liveModel);

      const house = scene.getMeshByName("world-surface-house:house:ember");
      const point = scene.getMeshByName("world-surface-node:lineage:ember:elder");
      expect(house?.position.asArray()).toEqual([12, 0.4, 17]);
      expect(point?.position.asArray()).toEqual([12, 0.32, 17]);
      expect(house?.metadata).toMatchObject({
        source: "server-authoritative-worldSurface",
        kind: "lineage_house",
        groupId: "house:ember",
      });
      expect(point?.metadata).toMatchObject({
        source: "server-authoritative-worldSurface",
        kind: "lineage_node",
        pointId: "lineage:ember:elder",
      });

      const emptyModel = createEmptyAuthoritativeSurfaceModel();
      expect(emptyModel.status).toBe("empty");
      renderer.apply(emptyModel);
      expect(scene.getMeshByName("world-surface-house:house:ember")).toBeNull();
      expect(scene.getMeshByName("world-surface-node:lineage:ember:elder")).toBeNull();

      renderer.apply(liveModel);
      const blockedModel = createBlockedAuthoritativeSurfaceModel();
      expect(blockedModel.status).toBe("blocked");
      renderer.apply(blockedModel);
      expect(scene.getMeshByName("world-surface-house:house:ember")).toBeNull();
      expect(scene.getMeshByName("world-surface-node:lineage:ember:elder")).toBeNull();
    } finally {
      renderer.dispose();
      scene.dispose();
      engine.dispose();
    }
  });
});
