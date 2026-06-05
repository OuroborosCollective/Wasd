// Live Gameplay Snapshot Store
// Client-side store for server-authoritative gameplay data
// Determinism: Pure display layer, no game logic decisions

import {
  EMPTY_LIVE_GAMEPLAY_SNAPSHOT,
  normalizeLiveGameplaySnapshot,
  type LiveGameplaySnapshot,
} from "./liveGameplaySnapshot";

type Listener = () => void;

export class LiveGameplayStore {
  private snapshot: LiveGameplaySnapshot = EMPTY_LIVE_GAMEPLAY_SNAPSHOT;
  private readonly listeners = new Set<Listener>();

  getSnapshot(): LiveGameplaySnapshot {
    return this.snapshot;
  }

  setSnapshot(next: Partial<LiveGameplaySnapshot>): void {
    this.snapshot = normalizeLiveGameplaySnapshot(next);
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
      type === "WORLD_SNAPSHOT"
    ) {
      this.setSnapshot({
        status: "live",
        serverTick:
          (payload?.serverTick as number) ??
          (payload?.tickId as number) ??
          null,
        quests: (payload?.quests as LiveGameplaySnapshot["quests"]) ?? [],
        guild: payload?.guild as LiveGameplaySnapshot["guild"],
        factions: (payload?.factions as LiveGameplaySnapshot["factions"]) ?? [],
        map: payload?.map as LiveGameplaySnapshot["map"],
      });
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

// HTTP fallback fetch for when WebSocket hasn't delivered data yet
export async function fetchGameplaySnapshot(): Promise<LiveGameplaySnapshot | null> {
  try {
    const response = await fetch("/api/gameplay/snapshot", {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      ok?: boolean;
      snapshot?: Partial<LiveGameplaySnapshot>;
    };
    return normalizeLiveGameplaySnapshot(data.snapshot ?? data);
  } catch {
    return null;
  }
}