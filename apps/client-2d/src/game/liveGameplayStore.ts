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
        character: payload?.character as LiveGameplaySnapshot["character"],
        paperdoll: payload?.paperdoll as LiveGameplaySnapshot["paperdoll"],
        quests: (payload?.quests as LiveGameplaySnapshot["quests"]) ?? [],
        skills: (payload?.skills as LiveGameplaySnapshot["skills"]) ?? [],
        resources: (payload?.resources as LiveGameplaySnapshot["resources"]) ?? [],
        inventory: payload?.inventory as LiveGameplaySnapshot["inventory"],
        crafting: payload?.crafting as LiveGameplaySnapshot["crafting"],
        equipment: payload?.equipment as LiveGameplaySnapshot["equipment"],
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
    const data = (await response.json()) as {
      ok?: boolean;
      snapshot?: Partial<LiveGameplaySnapshot>;
    };
    return normalizeLiveGameplaySnapshot(data.snapshot ?? data);
  } catch {
    return null;
  }
}
