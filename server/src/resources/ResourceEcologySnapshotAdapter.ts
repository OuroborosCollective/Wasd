/**
 * RESOURCE ECOLOGY SNAPSHOT ADAPTER
 *
 * Attaches server-derived ecology state to resource node snapshots.
 * This is a deterministic projection boundary, not a separate truth source.
 */

import type { ResourceNodeEcologySnapshot } from "./ResourceEcologyTypes.js";
import type { ResourceNodeSnapshot } from "./ResourceTypes.js";

export function attachResourceEcologySnapshot(
  snapshot: ResourceNodeSnapshot,
  ecology: ResourceNodeEcologySnapshot | null,
): ResourceNodeSnapshot {
  if (!ecology) return snapshot;

  return {
    ...snapshot,
    ecology,
    status: ecology.currentStock <= 0 ? "depleted" : snapshot.status,
  };
}

export function attachResourceEcologySnapshots(
  snapshots: readonly ResourceNodeSnapshot[],
  ecologySnapshots: readonly ResourceNodeEcologySnapshot[],
): ResourceNodeSnapshot[] {
  const ecologyByNodeId = new Map(ecologySnapshots.map((ecology) => [ecology.nodeId, ecology] as const));
  return snapshots
    .map((snapshot) => attachResourceEcologySnapshot(snapshot, ecologyByNodeId.get(snapshot.id) ?? null))
    // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
