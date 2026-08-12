/**
 * Babylon worldSurface renderer (issue #2464).
 *
 * The renderer consumes only the shared, read-only WorldOverlayModel. It does
 * not alter discovery state, derive fallback positions, or control simulation.
 * Persistent worldSurface facts are intentionally separate from the normal
 * entity-presence layer owned by MMORPGClientCore.
 */

import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import type { WorldOverlayModel } from "@wasd/shared";
import {
  overlaySurfaceGroupsTo3D,
  overlaySurfacePointsTo3D,
} from "./BabylonOverlayAdapter";

const RENDER_ROOT_NAME = "world-surface-overlay";

function createMaterial(name: string, scene: Scene, color: Color3): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.emissiveColor = color.scale(0.22);
  material.specularColor = Color3.Black();
  return material;
}

export class WorldSurfaceBabylonRenderer {
  private readonly root: Mesh;
  private readonly groupMeshes = new Map<string, Mesh>();
  private readonly pointMeshes = new Map<string, Mesh>();

  constructor(private readonly scene: Scene) {
    this.root = MeshBuilder.CreateBox(RENDER_ROOT_NAME, { size: 0.001 }, scene);
    this.root.isVisible = false;
    this.root.isPickable = false;
  }

  apply(model: WorldOverlayModel): void {
    const renderable = model.status === "live" || model.status === "stale";
    const groups = renderable ? overlaySurfaceGroupsTo3D(model) : [];
    const points = renderable ? overlaySurfacePointsTo3D(model) : [];
    const remainingGroups = new Set(groups.map((group) => group.id));
    const remainingPoints = new Set(points.map((point) => point.id));

    for (const group of groups) {
      let mesh = this.groupMeshes.get(group.id);
      if (!mesh) {
        mesh = MeshBuilder.CreateBox(`world-surface-house:${group.id}`, { width: 1.2, height: 0.8, depth: 1.2 }, this.scene);
        mesh.parent = this.root;
        mesh.isPickable = false;
        mesh.material = createMaterial(`world-surface-house-material:${group.id}`, this.scene, new Color3(0.95, 0.72, 0.25));
        this.groupMeshes.set(group.id, mesh);
      }
      mesh.position.copyFromFloats(group.x, 0.4, group.z);
      mesh.metadata = Object.freeze({
        source: "server-authoritative-worldSurface",
        kind: "lineage_house",
        groupId: group.id,
        title: group.title,
        memberCount: group.memberCount,
      });
    }

    for (const point of points) {
      let mesh = this.pointMeshes.get(point.id);
      if (!mesh) {
        mesh = MeshBuilder.CreateSphere(`world-surface-node:${point.id}`, { diameter: 0.32, segments: 8 }, this.scene);
        mesh.parent = this.root;
        mesh.isPickable = false;
        mesh.material = createMaterial(`world-surface-node-material:${point.id}`, this.scene, new Color3(0.18, 0.82, 1));
        this.pointMeshes.set(point.id, mesh);
      }
      mesh.position.copyFrom(new Vector3(point.x, 0.32, point.z));
      mesh.metadata = Object.freeze({
        source: "server-authoritative-worldSurface",
        kind: "lineage_node",
        pointId: point.id,
        raw: point.raw,
      });
    }

    this.removeAbsent(this.groupMeshes, remainingGroups);
    this.removeAbsent(this.pointMeshes, remainingPoints);
  }

  dispose(): void {
    this.removeAbsent(this.groupMeshes, new Set());
    this.removeAbsent(this.pointMeshes, new Set());
    this.root.dispose(false, true);
  }

  private removeAbsent(meshes: Map<string, Mesh>, liveIds: ReadonlySet<string>): void {
    for (const [id, mesh] of meshes) {
      if (liveIds.has(id)) continue;
      mesh.material?.dispose();
      mesh.dispose(false, true);
      meshes.delete(id);
    }
  }
}

let activeWorldSurfaceRenderer: WorldSurfaceBabylonRenderer | null = null;

export function installWorldSurfaceBabylonRenderer(scene: Scene): WorldSurfaceBabylonRenderer {
  activeWorldSurfaceRenderer?.dispose();
  activeWorldSurfaceRenderer = new WorldSurfaceBabylonRenderer(scene);
  return activeWorldSurfaceRenderer;
}

export function getWorldSurfaceBabylonRenderer(): WorldSurfaceBabylonRenderer | null {
  return activeWorldSurfaceRenderer;
}
