import type { WorldSnapshot } from "./protocol";

export interface SnapshotBuffer {
  push(snapshot: WorldSnapshot): void;
  getLatest(): WorldSnapshot | null;
  getLastServerTick(): number;
  size(): number;
  clear(): void;
}

export function createSnapshotBuffer(maxSnapshots = 12): SnapshotBuffer {
  const snapshots: WorldSnapshot[] = [];

  return {
    push(snapshot) {
      snapshots.push({
        ...snapshot,
        receivedAtMs: snapshot.receivedAtMs || performance.now()
      });

      snapshots.sort((a, b) => a.serverTick - b.serverTick);

      while (snapshots.length > maxSnapshots) {
        snapshots.shift();
      }
    },

    getLatest() {
      return snapshots.at(-1) ?? null;
    },

    getLastServerTick() {
      return snapshots.at(-1)?.serverTick ?? 0;
    },

    size() {
      return snapshots.length;
    },

    clear() {
      snapshots.length = 0;
    }
  };
}