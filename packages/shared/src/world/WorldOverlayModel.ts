/**
 * Shared WorldOverlayModel contract (CloudCraft integration #2464/#2465).
 *
 * A pure, read-only presentation model derived exclusively from
 * server-authoritative snapshot data. Both the 2D (PixiJS) and 3D (Babylon)
 * clients consume this same type contract so that POIs, resource nodes,
 * camp NPCs, and worldSurface facts render semantically identically across
 * renderers without a second truth source.
 *
 * Rules:
 * - No second truth: input is always a server snapshot.
 * - No client authority: the model is display-only.
 * - No Math.random() or wall-clock in the model.
 * - Status is honest: `live` requires real snapshot evidence.
 */

export type WorldOverlayStatus =
  | "live"
  | "waiting"
  | "empty"
  | "stale"
  | "blocked";

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

export interface WorldOverlaySurfaceGroup {
  readonly id: string;
  readonly title: string;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface WorldOverlaySurfacePoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface WorldOverlayEvidence {
  readonly serverTick: number | null;
  readonly poiCount: number;
  readonly resourceCount: number;
  readonly campNpcCount: number;
  readonly surfaceGroupCount: number;
  readonly surfacePointCount: number;
}

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
