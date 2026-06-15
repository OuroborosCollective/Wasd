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

  return Object.freeze({
    ...snapshot,
    ecology,
    status: ecology.currentStock <= 0 ? "depleted" : snapshot.status,
  });
}

export function attachResourceEcologySnapshots(
  snapshots: readonly ResourceNodeSnapshot[],
  ecologySnapshots: readonly ResourceNodeEcologySnapshot[],
): readonly ResourceNodeSnapshot[] {
  const ecologyByNodeId = new Map(ecologySnapshots.map((ecology) => [ecology.nodeId, ecology] as const));
  return Object.freeze(
    snapshots
      .map((snapshot) => attachResourceEcologySnapshot(snapshot, ecologyByNodeId.get(snapshot.id) ?? null))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
}
