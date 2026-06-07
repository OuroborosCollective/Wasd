// Live Gameplay Snapshot Store
// Client-side store for server-authoritative gameplay data
// Determinism: Pure display layer, no game logic decisions

import {
  EMPTY_LIVE_GAMEPLAY_SNAPSHOT,
  normalizeLiveGameplaySnapshot,
  type LiveGameplaySnapshot,
} from "./liveGameplaySnapshot";

type Listener = () => void;

function prettifyId(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function projectComposerSnapshot(input: Record<string, unknown>): Partial<LiveGameplaySnapshot> {
  const playerId = String(input.playerId ?? "guest");
  const inventory = Array.isArray(input.inventory) ? input.inventory : [];
  const equipment = Array.isArray(input.equipment) ? input.equipment : [];
  const skills = Array.isArray(input.skills) ? input.skills : [];
  const resourceNodes = Array.isArray(input.resourceNodes) ? input.resourceNodes : [];

  return {
    status: "live",
    serverTick: typeof input.logicalIndex === "number" ? input.logicalIndex : null,
    quests: [],
    skills: skills.map((skill: any) => {
      const id = String(skill.skillId ?? skill.id ?? "combat");
      return {
        id,
        title: prettifyId(id),
        level: Math.max(1, Math.floor(Number(skill.level ?? 1))),
        xp: Math.max(0, Math.floor(Number(skill.xp ?? 0))),
        xpForNextLevel: Math.max(1, Math.floor(Number(skill.xpForNextLevel ?? 100))),
        progressRatio: Math.max(0, Math.min(1, Number(skill.progressRatio ?? 0))),
      };
    }) as LiveGameplaySnapshot["skills"],
    resources: resourceNodes.map((node: any) => {
      const skillId = String(node.skillId ?? "woodcutting");
      const resourceId = String(node.resourceId ?? node.nodeId ?? "resource");
      const kind = skillId === "fishing" ? "fish_spot" : skillId === "mining" ? "ore" : "tree";
      return {
        id: String(node.nodeId ?? resourceId),
        kind,
        title: prettifyId(resourceId),
        skillId,
        requiredLevel: 1,
        xpReward: 0,
        itemRewardId: resourceId,
        itemRewardName: prettifyId(resourceId),
        position: {
          x: Number(node.x ?? 0),
          y: Number(node.y ?? 0),
        },
        radius: 16,
        status: node.available === false ? "depleted" : "available",
        depletedUntilTick: null,
        remainingTicks: 0,
      };
    }) as LiveGameplaySnapshot["resources"],
    inventory: {
      playerId,
      schemaVersion: 1,
      capacity: 32,
      slots: inventory.map((item: any) => {
        const itemId = String(item.itemId ?? item.id ?? "unknown_item");
        return {
          slotId: `slot_${itemId}`,
          itemId,
          name: prettifyId(itemId),
          quantity: Math.max(0, Math.floor(Number(item.quantity ?? item.count ?? 0))),
          category: "resource",
          stackable: true,
          maxStack: 999,
        };
      }),
    },
    equipment: {
      playerId,
      schemaVersion: 1,
      slots: equipment.map((slot: any) => ({
        slotId: String(slot.slot ?? slot.slotId ?? "unknown_slot"),
        itemId: String(slot.itemId ?? ""),
        title: prettifyId(String(slot.itemId ?? slot.slot ?? "empty")),
      })),
    },
  };
}

function mergeComposerIntoLegacy(
  legacy: Record<string, unknown>,
  composer: Record<string, unknown>,
): unknown {
  const projected = projectComposerSnapshot(composer) as Record<string, unknown>;

  return {
    ...legacy,
    status: projected.status ?? legacy.status,
    serverTick: projected.serverTick ?? legacy.serverTick,
    skills: projected.skills ?? legacy.skills,
    resources: projected.resources ?? legacy.resources,
    inventory: projected.inventory ?? legacy.inventory,
    equipment: projected.equipment ?? legacy.equipment,
  };
}

function pickSnapshotPayload(data: unknown): unknown {
  const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  // Existing route wrapper contract with post-#1762 sibling composer data.
  // Keep legacy as the base so Quest Journal, Character, Paperdoll, Crafting,
  // Guild/Faction and Map data are not lost.
  if (
    raw.snapshot &&
    typeof raw.snapshot === "object" &&
    raw.liveGameplaySnapshot &&
    typeof raw.liveGameplaySnapshot === "object"
  ) {
    return mergeComposerIntoLegacy(
      raw.snapshot as Record<string, unknown>,
      raw.liveGameplaySnapshot as Record<string, unknown>,
    );
  }

  // Preferred post-#1762 contract when it is the only available payload.
  if (raw.liveGameplaySnapshot && typeof raw.liveGameplaySnapshot === "object") {
    return projectComposerSnapshot(raw.liveGameplaySnapshot as Record<string, unknown>);
  }

  // Direct composer snapshot, e.g. WebSocket payload.
  if (raw.schemaVersion === "live-gameplay-snapshot.v1") {
    return projectComposerSnapshot(raw);
  }

  // Existing route wrapper contract.
  if (raw.snapshot && typeof raw.snapshot === "object") {
    const snapshot = raw.snapshot as Record<string, unknown>;
    if (snapshot.schemaVersion === "live-gameplay-snapshot.v1") {
      return projectComposerSnapshot(snapshot);
    }
    return snapshot;
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
