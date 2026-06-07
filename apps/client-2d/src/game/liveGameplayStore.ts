// Live Gameplay Snapshot Store
// Client-side store for server-authoritative gameplay data
// Determinism: Pure display layer, no game logic decisions

import {
  EMPTY_LIVE_GAMEPLAY_SNAPSHOT,
  normalizeLiveGameplaySnapshot,
  type LiveGameplaySnapshot,
} from "./liveGameplaySnapshot";

type Listener = () => void;

function pickSnapshotPayload(data: unknown): unknown {
  const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  // Preferred post-#1762 contract.
  if (raw.liveGameplaySnapshot && typeof raw.liveGameplaySnapshot === "object") {
    return raw.liveGameplaySnapshot;
  }

  // Existing route wrapper contract.
  if (raw.snapshot && typeof raw.snapshot === "object") {
    return raw.snapshot;
  }

  return data;
}

export class LiveGameplayStore {
  private snapshot: LiveGameplaySnapshot = EMPTY_LIVE_GAMEPLAY_SNAPSHOT;
  private readonly listeners = new Set<Listener>();

  getSnapshot(): LiveGameplaySnapshot {
    return this.snapshot;
  }

  setSnapshot(next: unknown): void {
    this.snapshot = normalizeLiveGameplaySnapshot(pickSnapshotPayload(next));
    this.emit();
  }

  updateFromNetworkPacket(packet: unknown): void {
    const detail = packet as Record<string, unknown>;
    const type = (detail?.type as string) ?? (detail?.event as string);
    const payload = (detail?.payload as Record<string, unknown>) ?? detail;

    if (
      type === "gameplay_snapshot" ||
      type === "GAMEPLAY_SNAPSHOT" ||
      type === "world_snapshot" ||
      type === "WORLD_SNAPSHOT" ||
      (payload && typeof payload === "object" && (payload as Record<string, unknown>).schemaVersion === "live-gameplay-snapshot.v1")
    ) {
      this.setSnapshot(payload);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}

export const liveGameplayStore = new LiveGameplayStore();

// HTTP fallback fetch for when WebSocket hasn't delivered data yet.
// This ID intentionally matches the guest/playtest HTTP fallback path.
export const DEFAULT_GAMEPLAY_PLAYER_ID = "guest";

export async function fetchGameplaySnapshot(
  playerId: string = DEFAULT_GAMEPLAY_PLAYER_ID
): Promise<LiveGameplaySnapshot | null> {
  try {
    const encodedPlayerId = encodeURIComponent(playerId);
    const response = await fetch(
      `/api/gameplay/snapshot?playerId=${encodedPlayerId}`,
      {
        cache: "no-store",
        headers: {
          "x-player-id": playerId,
        },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return normalizeLiveGameplaySnapshot(pickSnapshotPayload(data));
  } catch {
    return null;
  }
}
