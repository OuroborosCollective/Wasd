/**
 * Shared WorldOverlayModel derivation (CloudCraft integration #2464/#2465).
 *
 * Pure function that projects a server-authoritative snapshot payload into a
 * frozen, read-only WorldOverlayModel. Both 2D and 3D clients use this so that
 * the same snapshot produces semantically identical overlay facts.
 *
 * The input is a loosely-typed record so the derivation can run against either
 * the legacy or composer snapshot shape without importing client-specific
 * types. Invalid/missing fields are filtered or defaulted — never invented.
 */

import type {
  WorldOverlayCampNpc,
  WorldOverlayEvidence,
  WorldOverlayModel,
  WorldOverlayPoi,
  WorldOverlayResourceNode,
  WorldOverlayStatus,
  WorldOverlaySurfaceGroup,
  WorldOverlaySurfacePoint,
} from "./WorldOverlayModel";

export const EMPTY_WORLD_OVERLAY_EVIDENCE: WorldOverlayEvidence = Object.freeze({
  serverTick: null,
  poiCount: 0,
  resourceCount: 0,
  campNpcCount: 0,
  surfaceGroupCount: 0,
  surfacePointCount: 0,
});

export const EMPTY_WORLD_OVERLAY_MODEL: WorldOverlayModel = Object.freeze({
  status: "waiting",
  evidence: EMPTY_WORLD_OVERLAY_EVIDENCE,
  pois: Object.freeze([]),
  resourceNodes: Object.freeze([]),
  campNpcs: Object.freeze([]),
  surfaceGroups: Object.freeze([]),
  surfacePoints: Object.freeze([]),
  worldSurfaceTick: 0,
});

const VALID_RESOURCE_KINDS = new Set(["tree", "ore", "fish_spot"]);
const VALID_SKILL_IDS = new Set(["woodcutting", "mining", "fishing"]);
const VALID_CAMP_TYPES = new Set(["camp_woodcutter", "camp_miner", "camp_fisher"]);
const VALID_CAMP_STATES = new Set(["idle", "working", "resting"]);
const VALID_CAMP_ACTIVITIES = new Set(["gathering", "returning", "depositing"]);

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

function projectPois(input: unknown): WorldOverlayPoi[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(isRecord)
    .map((poi): WorldOverlayPoi => ({
      poiId: asString(poi.poiId),
      type: asString(poi.type),
      title: asString(poi.title, asString(poi.poiId)),
      x: asNumber(poi.x),
      y: asNumber(poi.y),
      chunkX: typeof poi.chunkX === "number" ? poi.chunkX : 0,
      chunkZ: typeof poi.chunkZ === "number" ? poi.chunkZ : 0,
      discovered: poi.discovered !== false,
    }))
    .filter((p) => p.poiId.length > 0)
    .sort((a, b) => relationalCompare(a.poiId, b.poiId));
}

function projectResourceNodes(input: unknown): WorldOverlayResourceNode[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(isRecord)
    .map((node): WorldOverlayResourceNode | null => {
      const kind = asString(node.kind);
      const skillId = asString(node.skillId);
      if (!VALID_RESOURCE_KINDS.has(kind) || !VALID_SKILL_IDS.has(skillId)) return null;
      const pos = isRecord(node.position) ? node.position : {};
      return {
        id: asString(node.id),
        kind: kind as WorldOverlayResourceNode["kind"],
        title: asString(node.title, asString(node.id)),
        skillId: skillId as WorldOverlayResourceNode["skillId"],
        x: asNumber(pos.x),
        y: asNumber(pos.y),
        radius: Math.max(1, asNumber(node.radius, 16)),
        status:
          node.status === "depleted" ? "depleted" :
          node.status === "locked" ? "locked" : "available",
      };
    })
    .filter((n): n is WorldOverlayResourceNode => n !== null && n.id.length > 0)
    .sort((a, b) => relationalCompare(a.id, b.id));
}

function projectCampNpcs(input: unknown): WorldOverlayCampNpc[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(isRecord)
    .map((npc): WorldOverlayCampNpc | null => {
      const type = asString(npc.type);
      if (!VALID_CAMP_TYPES.has(type)) return null;
      const pos = isRecord(npc.position) ? npc.position : {};
      const state = asString(npc.state);
      const activity = asString(npc.activity);
      return {
        id: asString(npc.id),
        type: type as WorldOverlayCampNpc["type"],
        name: asString(npc.name, asString(npc.id)),
        role: asString(npc.role, "Worker"),
        poiId: asString(npc.poiId),
        x: asNumber(pos.x),
        y: asNumber(pos.y),
        state: VALID_CAMP_STATES.has(state) ? (state as WorldOverlayCampNpc["state"]) : "idle",
        activity: VALID_CAMP_ACTIVITIES.has(activity) ? (activity as WorldOverlayCampNpc["activity"]) : "gathering",
        activityMessage: asString(npc.activityMessage),
      };
    })
    .filter((n): n is WorldOverlayCampNpc => n !== null && n.id.length > 0)
    .sort((a, b) => relationalCompare(a.id, b.id));
}

function projectSurfaceGroups(input: unknown): WorldOverlaySurfaceGroup[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(isRecord)
    .map((group, index): WorldOverlaySurfaceGroup => {
      const id = asString(group.id) || `surface_group_${index}`;
      return {
        id,
        title: asString(group.title, id),
        raw: Object.freeze({ ...group }) as Readonly<Record<string, unknown>>,
      };
    })
    .sort((a, b) => relationalCompare(a.id, b.id));
}

function projectSurfacePoints(input: unknown): WorldOverlaySurfacePoint[] {
  if (!Array.isArray(input)) return [];
  return input
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

function deriveStatus(
  status: unknown,
  hasSurface: boolean,
  totalEntries: number,
): WorldOverlayStatus {
  if (status === "stale") return "stale";
  if (status === "waiting") return "waiting";
  if (!hasSurface) return "blocked";
  // Snapshot claims live but is empty — honest empty, not fake live.
  if (status === "live" && totalEntries === 0) return "empty";
  if (status === "live") return "live";
  return totalEntries === 0 ? "empty" : "waiting";
}

/**
 * Derive a frozen, read-only WorldOverlayModel from a server snapshot record.
 * The input may be a legacy or composer-shaped snapshot — both are handled.
 * Pure function: no mutation of input, no side effects, no randomness.
 */
export function deriveWorldOverlayModelFromSnapshot(
  input: Record<string, unknown> | null | undefined,
): WorldOverlayModel {
  if (!input) return EMPTY_WORLD_OVERLAY_MODEL;

  const surfaceRaw = isRecord(input.worldSurface) ? input.worldSurface : null;
  const surfaceGroups = projectSurfaceGroups(surfaceRaw?.groups);
  const surfacePoints = projectSurfacePoints(surfaceRaw?.points);
  const surfaceTick = Math.max(0, Math.floor(asNumber(surfaceRaw?.tick)));

  // POIs may be under worldPois (legacy) or worldPois (composer).
  const pois = projectPois(input.worldPois);
  const resourceNodes = projectResourceNodes(input.resources ?? input.resourceNodes);
  const campNpcs = projectCampNpcs(input.campNpcs);

  const evidence: WorldOverlayEvidence = Object.freeze({
    serverTick: typeof input.serverTick === "number" ? input.serverTick : typeof input.logicalIndex === "number" ? (input.logicalIndex as number) : null,
    poiCount: pois.length,
    resourceCount: resourceNodes.length,
    campNpcCount: campNpcs.length,
    surfaceGroupCount: surfaceGroups.length,
    surfacePointCount: surfacePoints.length,
  });

  const totalEntries = pois.length + resourceNodes.length + campNpcs.length + surfaceGroups.length + surfacePoints.length;
  const status = deriveStatus(input.status, surfaceRaw !== null, totalEntries);

  return Object.freeze({
    status,
    evidence,
    pois: Object.freeze(pois),
    resourceNodes: Object.freeze(resourceNodes),
    campNpcs: Object.freeze(campNpcs),
    surfaceGroups: Object.freeze(surfaceGroups),
    surfacePoints: Object.freeze(surfacePoints),
    worldSurfaceTick: surfaceTick,
  });
}
