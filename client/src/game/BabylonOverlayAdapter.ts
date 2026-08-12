/**
 * 3D client overlay adapter (CloudCraft integration #2464).
 *
 * Adapts a shared WorldOverlayModel into the 3D (Babylon) client's minimap
 * coordinate space and provides discovery-fact projection for worldSurface
 * groups/points. Entity-presence (live NPCs/players) is kept strictly
 * separate from persistent discovery facts (POIs, surface points).
 *
 * The adapter is display-only: it never mutates the WorldOverlayModel and
 * never invents facts not present in the server snapshot.
 */

import type {
  WorldOverlayModel,
  WorldOverlayPoi,
  WorldOverlaySurfacePoint,
} from "@wasd/shared";

export interface MinimapMarker {
  id: string;
  type: "poi" | "resource" | "camp_npc";
  x: number;
  z: number;
  label: string;
  color: string;
  discovered: boolean;
}

export interface SurfacePointMarker {
  id: string;
  x: number;
  z: number;
  raw: Readonly<Record<string, unknown>>;
}

export interface OverlayAdapterInput {
  model: WorldOverlayModel;
  worldHalfExtent: number;
  minimapSize: number;
}

const POI_COLORS: Record<string, string> = {
  village: "#ffd97a",
  camp: "#7adbff",
  dungeon: "#ff7a7a",
  resource: "#9be36b",
  landmark: "#c89bff",
  default: "#b9c0cf",
};

function colorForPoiType(type: string): string {
  return POI_COLORS[type] ?? POI_COLORS.default;
}

/**
 * Project a world position (x, y in world units) into minimap pixel space,
 * centered on the local player's world position.
 *
 * World y (server) maps to minimap z (Babylon depth). The minimap uses the
 * same rotation convention as the 2D iso projection but in top-down space.
 */
export function projectWorldToMinimap(
  worldX: number,
  worldY: number,
  centerWorldX: number,
  centerWorldY: number,
  worldHalfExtent: number,
  minimapSize: number,
  zoom: number,
  rotationRad: number,
): [number, number] {
  const dx = worldX - centerWorldX;
  const dz = worldY - centerWorldY;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  const rx = dx * cos - dz * sin;
  const rz = dx * sin + dz * cos;
  const scaledHalfExtent = worldHalfExtent / Math.max(0.001, zoom);
  const unitsToPixels = minimapSize / 2 / Math.max(0.001, scaledHalfExtent);
  return [rx * unitsToPixels, rz * unitsToPixels];
}

/**
 * Convert WorldOverlayModel POIs into minimap markers.
 * Undiscovered POIs are excluded — only discovered facts are shown.
 */
export function overlayPoisToMinimapMarkers(
  model: WorldOverlayModel,
): MinimapMarker[] {
  if (model.status === "blocked" || model.status === "waiting") return [];
  return model.pois
    .filter((poi) => poi.discovered)
    .map((poi): MinimapMarker => ({
      id: `poi:${poi.poiId}`,
      type: "poi",
      x: poi.x,
      z: poi.y,
      label: poi.title,
      color: colorForPoiType(poi.type),
      discovered: poi.discovered,
    }));
}

/**
 * Convert WorldOverlayModel resource nodes into minimap markers.
 */
export function overlayResourcesToMinimapMarkers(
  model: WorldOverlayModel,
): MinimapMarker[] {
  if (model.status === "blocked" || model.status === "waiting") return [];
  return model.resourceNodes
    .filter((node) => node.status !== "depleted")
    .map((node): MinimapMarker => ({
      id: `resource:${node.id}`,
      type: "resource",
      x: node.x,
      z: node.y,
      label: node.title,
      color: node.status === "locked" ? "#777" : "#9be36b",
      discovered: true,
    }));
}

/**
 * Convert WorldOverlayModel camp NPCs into minimap markers.
 */
export function overlayCampNpcsToMinimapMarkers(
  model: WorldOverlayModel,
): MinimapMarker[] {
  if (model.status === "blocked" || model.status === "waiting") return [];
  return model.campNpcs.map((npc): MinimapMarker => ({
    id: `camp_npc:${npc.id}`,
    type: "camp_npc",
    x: npc.x,
    z: npc.y,
    label: npc.name,
    color: "#3ecf7a",
    discovered: true,
  }));
}

/**
 * Project surface points (worldSurface.points) into 3D world-space markers.
 * These represent persistent discovery facts (buildings, nodes) that the 3D
 * renderer can place as Babylon meshes or billboards.
 */
export function overlaySurfacePointsTo3D(
  model: WorldOverlayModel,
): SurfacePointMarker[] {
  if (model.status === "blocked" || model.status === "waiting") return [];
  return model.surfacePoints.map(
    (point): SurfacePointMarker => ({
      id: point.id,
      x: point.x,
      z: point.y,
      raw: point.raw,
    }),
  );
}

/**
 * Build the full minimap marker set from a WorldOverlayModel.
 * Discovery facts (POIs, resources, camp NPCs) are merged deterministically
 * by id so the render order is stable across frames.
 */
export function buildMinimapMarkersFromOverlay(
  model: WorldOverlayModel,
): MinimapMarker[] {
  const poiMarkers = overlayPoisToMinimapMarkers(model);
  const resourceMarkers = overlayResourcesToMinimapMarkers(model);
  const campNpcMarkers = overlayCampNpcsToMinimapMarkers(model);
  return [...poiMarkers, ...resourceMarkers, ...campNpcMarkers].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
}

/**
 * Honest overlay state label for the minimap HUD.
 */
export function overlayStatusLabel(model: WorldOverlayModel): string {
  switch (model.status) {
    case "live":
      return "LIVE";
    case "waiting":
      return "waiting";
    case "empty":
      return "empty";
    case "stale":
      return "stale";
    case "blocked":
      return "blocked";
    default:
      return "unknown";
  }
}
