import { attachResourceEcologySnapshots } from "./ResourceEcologySnapshotAdapter.js";
import { resourceEcologyService } from "./ResourceEcologyService.js";
import type { ResourceNodeEcologySnapshot } from "./ResourceEcologyTypes.js";
import { resourceNodeStore } from "./ResourceNodeStore.js";
import type { ResourceNodeSnapshot } from "./ResourceTypes.js";

/**
 * Projects visible resource nodes without registering chunks, nodes, ecology state,
 * or committing respawn transitions. Safe for GET/read paths.
 */
export function previewVisibleResourceSnapshots(
  currentTick: number,
  playerPosition?: { readonly x: number; readonly y: number },
): ResourceNodeSnapshot[] {
  const snapshots = resourceNodeStore.previewVisibleSnapshots(currentTick, playerPosition);
  const ecologySnapshots = snapshots
    .map((snapshot) => resourceEcologyService.getNodeSnapshot(snapshot.id, currentTick))
    .filter((snapshot): snapshot is ResourceNodeEcologySnapshot => snapshot !== null);
  return attachResourceEcologySnapshots(snapshots, ecologySnapshots);
}
