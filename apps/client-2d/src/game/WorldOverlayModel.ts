/**
 * WorldOverlayModel
 *
 * A pure, read-only presentation model derived exclusively from the
 * server-authoritative LiveGameplaySnapshot. It never creates truth — it
 * only projects snapshot facts into a deterministic, stably-sorted overlay
 * shape consumed by the 2D render adapters.
 *
 * Rules (issue #2465):
 * - No second truth source: input is always a LiveGameplaySnapshot.
 * - No client authority: this model is display-only.
 * - No Math.random() or wall-clock in the presentation model.
 * - Status is honest: `live` requires real snapshot evidence; otherwise
 *   `waiting`/`empty`/`stale`/`blocked` is reported.
 */

import type { LiveGameplaySnapshot } from "./liveGameplaySnapshot";
import type { WorldSurfaceSnapshot } from "./worldSurface";
import type { LiveGameplaySnapshotWithWorldSurface } from "./liveGameplayWorldSurfaceSnapshot";

/** Honest overlay status derived from snapshot evidence. */
export type WorldOverlayStatus =
  | "live"
  | "waiting"
  | "empty"
  | "stale"
  | "blocked";

/** A POI marker entry in the overlay model (sorted, frozen). */
export interface WorldOverlayPoi {
  readonly poiId: string;
  readonly type: string;
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly chunkX: number;
  readonly chunkZ: number;
  readonly discovered: boolean;
}

/** A resource node marker entry in the overlay model. */
export interface WorldOverlayResourceNode {
  readonly id: string;
  readonly kind: "tree" | "ore" | "fish_spot";
  readonly title: string;
  readonly skillId: "woodcutting" | "mining" | "fishing";
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly status: "available" | "depleted" | "locked";
}

/** A camp NPC marker entry in the overlay model. */
export interface WorldOverlayCampNpc {
  readonly id: string;
  readonly type: "camp_woodcutter" | "camp_miner" | "camp_fisher";
  readonly name: string;
  readonly role: string;
  readonly poiId: string;
  readonly x: number;
  readonly y: number;
  readonly state: "idle" | "working" | "resting";
  readonly activity: "gathering" | "returning" | "depositing";
  readonly activityMessage: string;
}

/** A surface group entry (Lineage houses) from worldSurface. */
export interface WorldOverlaySurfaceGroup {
  readonly id: string;
  readonly title: string;
  readonly raw: Readonly<Record<string, unknown>>;
}

/** A surface point entry (Lineage NPC nodes) from worldSurface. */
export interface WorldOverlaySurfacePoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly raw: Readonly<Record<string, unknown>>;
}

/** Evidence describing why the model holds its status. */
export interface WorldOverlayEvidence {
  /** The server tick backing this overlay, or null when no live snapshot. */
  readonly serverTick: number | null;
  /** Counts of projected entries — real, not asserted. */
  readonly poiCount: number;
  readonly resourceCount: number;
  readonly campNpcCount: number;
  readonly surfaceGroupCount: number;
  readonly surfacePointCount: number;
}

/** The frozen, read-only overlay model. */
export interface WorldOverlayModel {
  readonly status: WorldOverlayStatus;
  readonly evidence: WorldOverlayEvidence;
  readonly pois: readonly WorldOverlayPoi[];
  readonly resourceNodes: readonly WorldOverlayResourceNode[];
  readonly campNpcs: readonly WorldOverlayCampNpc[];
  readonly surfaceGroups: readonly WorldOverlaySurfaceGroup[];
  readonly surfacePoints: readonly WorldOverlaySurfacePoint[];
  readonly worldSurfaceTick: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function relationalCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const EMPTY_EVIDENCE: WorldOverlayEvidence = Object.freeze({
  serverTick: null,
  poiCount: 0,
  resourceCount: 0,
  campNpcCount: 0,
  surfaceGroupCount: 0,
  surfacePointCount: 0,
});

export const EMPTY_WORLD_OVERLAY_MODEL: WorldOverlayModel = Object.freeze({
  status: "waiting",
  evidence: EMPTY_EVIDENCE,
  pois: Object.freeze([]),
  resourceNodes: Object.freeze([]),
  campNpcs: Object.freeze([]),
  surfaceGroups: Object.freeze([]),
  surfacePoints: Object.freeze([]),
  worldSurfaceTick: 0,
});

function projectPois(snapshot: LiveGameplaySnapshot): WorldOverlayPoi[] {
  const pois = snapshot.worldPois ?? [];
  return pois
    .map((poi): WorldOverlayPoi => ({
      poiId: String(poi.poiId),
      type: String(poi.type),
      title: String(poi.title ?? poi.poiId),
      x: asNumber(poi.x),
      y: asNumber(poi.y),
      chunkX: typeof poi.chunkX === "number" ? poi.chunkX : 0,
      chunkZ: typeof poi.chunkZ === "number" ? poi.chunkZ : 0,
      discovered: poi.discovered ?? true,
    }))
    .sort((a, b) => relationalCompare(a.poiId, b.poiId));
}

function projectResourceNodes(snapshot: LiveGameplaySnapshot): WorldOverlayResourceNode[] {
  const resources = snapshot.resources ?? [];
  const validKinds = new Set(["tree", "ore", "fish_spot"]);
  const validSkills = new Set(["woodcutting", "mining", "fishing"]);
  return resources
    .filter((node) => validKinds.has(node.kind) && validSkills.has(node.skillId))
    .map((node): WorldOverlayResourceNode => ({
      id: String(node.id),
      kind: node.kind,
      title: String(node.title ?? node.id),
      skillId: node.skillId,
      x: asNumber(node.position?.x),
      y: asNumber(node.position?.y),
      radius: Math.max(1, asNumber(node.radius, 16)),
      status: node.status === "depleted" ? "depleted" : node.status === "locked" ? "locked" : "available",
    }))
    .sort((a, b) => relationalCompare(a.id, b.id));
}

function projectCampNpcs(snapshot: LiveGameplaySnapshot): WorldOverlayCampNpc[] {
  const npcs = snapshot.campNpcs ?? [];
  const validTypes = new Set(["camp_woodcutter", "camp_miner", "camp_fisher"]);
  const validStates = new Set(["idle", "working", "resting"]);
  const validActivities = new Set(["gathering", "returning", "depositing"]);
  return npcs
    .filter((npc) => validTypes.has(npc.type))
    .map((npc): WorldOverlayCampNpc => ({
      id: String(npc.id),
      type: npc.type,
      name: String(npc.name ?? npc.id),
      role: String(npc.role ?? "Worker"),
      poiId: String(npc.poiId ?? ""),
      x: asNumber(npc.position?.x),
      y: asNumber(npc.position?.y),
      state: validStates.has(npc.state) ? npc.state : "idle",
      activity: validActivities.has(npc.activity) ? npc.activity : "gathering",
      activityMessage: String(npc.activityMessage ?? ""),
    }))
    .sort((a, b) => relationalCompare(a.id, b.id));
}

function projectSurfaceGroups(surface: WorldSurfaceSnapshot): WorldOverlaySurfaceGroup[] {
  const groups = Array.isArray(surface.groups) ? surface.groups : [];
  return groups
    .filter(isRecord)
    .map((group, index): WorldOverlaySurfaceGroup => {
      const id = asString(group.id) || `surface_group_${index}`;
      return {
        id,
        title: asString(group.title) || id,
        raw: Object.freeze({ ...group }) as Readonly<Record<string, unknown>>,
      };
    })
    .sort((a, b) => relationalCompare(a.id, b.id));
}

function projectSurfacePoints(surface: WorldSurfaceSnapshot): WorldOverlaySurfacePoint[] {
  const points = Array.isArray(surface.points) ? surface.points : [];
  return points
    .filter(isRecord)
    .map((point, index): WorldOverlaySurfacePoint => {
      const id = asString(point.id) || `surface_point_${index}`;
      return {
        id,
        x: asNumber(point.x),
        y: asNumber(point.y),
        raw: Object.freeze({ ...point }) as Readonly<Record<string, unknown>>,
      };
    })
    .sort((a, b) => relationalCompare(a.id, b.id));
}

function deriveStatus(snapshot: LiveGameplaySnapshot, hasSurface: boolean): WorldOverlayStatus {
  if (snapshot.status === "live") return "live";
  if (snapshot.status === "stale") return "stale";
  if (snapshot.status === "waiting") return "waiting";
  if (!hasSurface) return "blocked";
  const total =
    (snapshot.worldPois?.length ?? 0) +
    (snapshot.resources?.length ?? 0) +
    (snapshot.campNpcs?.length ?? 0);
  return total === 0 ? "empty" : "waiting";
}

/**
 * Derive a frozen, read-only WorldOverlayModel from a server-authoritative
 * snapshot. Pure function — no mutation of input, no side effects.
 */
export function deriveWorldOverlayModel(
  snapshot: (LiveGameplaySnapshot & { readonly worldSurface?: WorldSurfaceSnapshot }) | null | undefined,
): WorldOverlayModel {
  if (!snapshot) return EMPTY_WORLD_OVERLAY_MODEL;

  const surface: WorldSurfaceSnapshot =
    (snapshot as LiveGameplaySnapshotWithWorldSurface).worldSurface ??
    (isRecord((snapshot as any).worldSurface)
      ? ((snapshot as any).worldSurface as WorldSurfaceSnapshot)
      : ({ groups: [], points: [], tick: 0 } as unknown as WorldSurfaceSnapshot));

  const pois = projectPois(snapshot);
  const resourceNodes = projectResourceNodes(snapshot);
  const campNpcs = projectCampNpcs(snapshot);
  const surfaceGroups = projectSurfaceGroups(surface);
  const surfacePoints = projectSurfacePoints(surface);

  const evidence: WorldOverlayEvidence = Object.freeze({
    serverTick: typeof snapshot.serverTick === "number" ? snapshot.serverTick : null,
    poiCount: pois.length,
    resourceCount: resourceNodes.length,
    campNpcCount: campNpcs.length,
    surfaceGroupCount: surfaceGroups.length,
    surfacePointCount: surfacePoints.length,
  });

  return Object.freeze({
    status: deriveStatus(snapshot, Boolean(surface && Array.isArray(surface.groups))),
    evidence,
    pois: Object.freeze(pois),
    resourceNodes: Object.freeze(resourceNodes),
    campNpcs: Object.freeze(campNpcs),
    surfaceGroups: Object.freeze(surfaceGroups),
    surfacePoints: Object.freeze(surfacePoints),
    worldSurfaceTick: Math.max(0, Math.floor(asNumber(surface?.tick))),
  });
}
