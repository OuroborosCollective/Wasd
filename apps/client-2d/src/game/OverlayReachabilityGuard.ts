/**
 * OverlayReachabilityGuard
 *
 * Verifies that overlay components claiming LIVE status are actually reachable
 * from the real /2d entrypoint. A component is "reachable" only when it is
 * imported by the module graph rooted at the 2D entry (main.tsx →
 * DeterministicWorldIsoApp → ArelorianStitchHud / UIOverlayLayer).
 *
 * This replaces fake LIVE assertions in uiRuntimeManifest with honest,
 * evidence-based status.
 *
 * Rules (issue #2465):
 * - LIVE status requires real import-chain proof, not a hardcoded claim.
 * - No green state without causality.
 */

export type ReachabilityStatus = "live" | "blocked" | "unknown";

export interface ReachabilityEntry {
  readonly id: string;
  readonly path: string;
  readonly status: ReachabilityStatus;
  readonly evidence: string;
}

export interface ReachabilityReport {
  readonly entries: readonly ReachabilityEntry[];
  readonly allLive: boolean;
}

/**
 * Registry of overlay components and their real reachability status.
 * Each entry's status is backed by an explicit import marker (see below).
 */
const OVERLAY_COMPONENT_REGISTRY: ReadonlyArray<{ id: string; path: string }> = Object.freeze([
  { id: "world-poi-marker-layer", path: "apps/client-2d/src/ui/WorldPoiMarkerLayer.tsx" },
  { id: "resource-node-marker-layer", path: "apps/client-2d/src/ui/ResourceNodeMarkerLayer.tsx" },
  { id: "camp-npc-marker-layer", path: "apps/client-2d/src/ui/CampNpcMarkerLayer.tsx" },
]);

/**
 * The set of component IDs that have been proven reachable via a real import
 * from the /2d entrypoint. This set is populated at module-eval time by the
 * `markOverlayReachable` calls in the entry modules that actually import and
 * mount these layers. If a layer is never imported, its ID never lands here,
 * and its status stays "blocked" — honest, not fake.
 */
const reachableOverlayIds = new Set<string>();

export function markOverlayReachable(componentId: string): void {
  reachableOverlayIds.add(componentId);
}

export function isOverlayReachable(componentId: string): boolean {
  return reachableOverlayIds.has(componentId);
}

/**
 * Build an honest reachability report for all registered overlay components.
 */
export function buildOverlayReachabilityReport(): ReachabilityReport {
  const entries: ReachabilityEntry[] = OVERLAY_COMPONENT_REGISTRY.map((entry) => {
    const reachable = isOverlayReachable(entry.id);
    return {
      id: entry.id,
      path: entry.path,
      status: (reachable ? "live" : "blocked") as ReachabilityStatus,
      evidence: reachable
        ? "Imported and mounted via real /2d entrypoint module graph."
        : "Not imported by any entrypoint module — LIVE claim is unproven.",
    };
  });
  return {
    entries: Object.freeze(entries),
    allLive: entries.every((e) => e.status === "live"),
  };
}
