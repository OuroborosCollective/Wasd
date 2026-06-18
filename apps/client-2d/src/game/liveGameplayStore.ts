// Live Gameplay Snapshot Store
// Client-side store for server-authoritative gameplay data
// Determinism: Pure display layer, no game logic decisions

import {
  EMPTY_LIVE_GAMEPLAY_SNAPSHOT,
} from "./liveGameplaySnapshot";
import {
  normalizeLiveGameplaySnapshotWithWorldSurface as normalizeLiveGameplaySnapshot,
  type LiveGameplaySnapshotWithWorldSurface as LiveGameplaySnapshot,
} from "./liveGameplayWorldSurfaceSnapshot";
import { readPlayerPositionBridge } from "./PlayerPositionBridge";

type Listener = () => void;

type ComposerQuestObjective = {
  readonly objectiveId?: unknown;
  readonly title?: unknown;
  readonly current?: unknown;
  readonly required?: unknown;
  readonly completed?: unknown;
};

type ComposerQuestProgress = {
  readonly questId?: unknown;
  readonly id?: unknown;
  readonly title?: unknown;
  readonly description?: unknown;
  readonly state?: unknown;
  readonly objectives?: unknown;
};

const GAMEPLAY_PLAYER_ID_KEY = "wasd:2d:playerId";
const PUBLIC_KEY_KEY = "wasd:2d:publicKey";
const ANON_ID_SEED_KEY = "wasd:2d:anonSeed";

function stableHash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function prettifyId(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function safeStoredValue(key: string): string | null {
  try {
    const value = localStorage.getItem(key)?.trim();
    return value && /^[a-zA-Z0-9._:-]{1,96}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

function resolveAnonymousGameplayPlayerId(): string {
  const existing = safeStoredValue(ANON_ID_SEED_KEY);
  if (existing) return existing;

  const basis = [
    globalThis.location?.origin ?? "originless",
    globalThis.navigator?.userAgent ?? "agentless",
    globalThis.navigator?.language ?? "langless",
  ].join("|");
  const playerId = `anon_${stableHash32(`gameplay:${basis}`).toString(16).padStart(8, "0")}`;

  try {
    localStorage.setItem(ANON_ID_SEED_KEY, playerId);
  } catch {
    // Storage can be unavailable in privacy/test contexts; the derived ID remains deterministic for this runtime basis.
  }

  return playerId;
}

export function getDefaultGameplayPlayerId(): string {
  return safeStoredValue(GAMEPLAY_PLAYER_ID_KEY) ?? safeStoredValue(PUBLIC_KEY_KEY) ?? resolveAnonymousGameplayPlayerId();
}

function questStatusFromComposerState(state: unknown): LiveGameplaySnapshot["quests"][number]["status"] {
  if (state === "available" || state === "active" || state === "completed") return state;
  if (state === "ready_to_complete") return "completed";
  return "active";
}

function normalizeComposerObjective(input: ComposerQuestObjective): LiveGameplaySnapshot["quests"][number]["objectives"][number] | null {
  const objectiveId = typeof input.objectiveId === "string" && input.objectiveId.trim()
    ? input.objectiveId.trim()
    : null;
  if (!objectiveId) return null;

  const required = Math.max(1, Math.floor(Number(input.required ?? 1)));
  const current = Math.max(0, Math.min(required, Math.floor(Number(input.current ?? 0))));

  return {
    id: objectiveId,
    label: String(input.title ?? prettifyId(objectiveId)),
    current,
    required,
    completed: Boolean(input.completed ?? current >= required),
  };
}

function projectComposerQuest(input: ComposerQuestProgress): LiveGameplaySnapshot["quests"][number] | null {
  const questId = typeof input.questId === "string" && input.questId.trim()
    ? input.questId.trim()
    : typeof input.id === "string" && input.id.trim()
      ? input.id.trim()
      : null;
  if (!questId) return null;

  const objectives = Array.isArray(input.objectives)
    ? input.objectives
        .map((objective) => normalizeComposerObjective(objective as ComposerQuestObjective))
        .filter((objective): objective is LiveGameplaySnapshot["quests"][number]["objectives"][number] => objective !== null)
        .sort((a, b) => a.id.localeCompare(b.id))
    : [];

  return {
    id: questId,
    title: String(input.title ?? prettifyId(questId)),
    description: String(input.description ?? ""),
    status: questStatusFromComposerState(input.state),
    objectives,
  };
}

function appendComposerQuestList(
  output: LiveGameplaySnapshot["quests"],
  seenQuestIds: Set<string>,
  input: unknown,
): LiveGameplaySnapshot["quests"] {
  if (!Array.isArray(input)) return output;

  for (const rawQuest of input) {
    const quest = projectComposerQuest(rawQuest as ComposerQuestProgress);
    if (!quest || seenQuestIds.has(quest.id)) continue;
    seenQuestIds.add(quest.id);
    output.push(quest);
  }

  return output;
}

function projectComposerQuests(input: Record<string, unknown>): LiveGameplaySnapshot["quests"] {
  const output: LiveGameplaySnapshot["quests"] = [];
  const seenQuestIds = new Set<string>();

  if (Array.isArray(input.quests)) {
    for (const rawQuest of input.quests) {
      const quest = projectComposerQuest(rawQuest as ComposerQuestProgress);
      if (!quest || seenQuestIds.has(quest.id)) continue;
      seenQuestIds.add(quest.id);
      output.push(quest);
    }
  }

  appendComposerQuestList(output, seenQuestIds, input.activeQuests);
  appendComposerQuestList(output, seenQuestIds, input.availableQuests);

  if (Array.isArray(input.completedQuestIds)) {
    for (const rawQuestId of input.completedQuestIds) {
      if (typeof rawQuestId !== "string") continue;
      const questId = rawQuestId.trim();
      if (!questId || seenQuestIds.has(questId)) continue;
      seenQuestIds.add(questId);
      output.push({
        id: questId,
        title: prettifyId(questId),
        description: "",
        status: "completed",
        objectives: [],
      });
    }
  }

  return output.sort((a, b) => a.id.localeCompare(b.id));
}

function copyArrayField(input: unknown): unknown[] {
  return Array.isArray(input) ? [...input] : [];
}

function projectComposerSnapshot(input: Record<string, unknown>): Partial<LiveGameplaySnapshot> {
  const playerId = String(input.playerId ?? getDefaultGameplayPlayerId());
  const inventory = Array.isArray(input.inventory) ? input.inventory : [];
  const equipment = Array.isArray(input.equipment) ? input.equipment : [];
  const skills = Array.isArray(input.skills) ? input.skills : [];
  const resourceNodes = Array.isArray(input.resourceNodes) ? input.resourceNodes : [];

  return {
    status: "live",
    serverTick: typeof input.logicalIndex === "number" ? input.logicalIndex : null,
    quests: projectComposerQuests(input),
    activeQuests: copyArrayField(input.activeQuests) as LiveGameplaySnapshot["activeQuests"],
    availableQuests: copyArrayField(input.availableQuests) as LiveGameplaySnapshot["availableQuests"],
    completedQuestIds: copyArrayField(input.completedQuestIds) as LiveGameplaySnapshot["completedQuestIds"],
    npcDialogues: copyArrayField(input.npcDialogues) as LiveGameplaySnapshot["npcDialogues"],
    npcReputations: copyArrayField(input.npcReputations) as LiveGameplaySnapshot["npcReputations"],
    npcMemories: copyArrayField(input.npcMemories) as LiveGameplaySnapshot["npcMemories"],
    npcRumors: copyArrayField(input.npcRumors) as LiveGameplaySnapshot["npcRumors"],
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
    worldSurface: input.worldSurface as LiveGameplaySnapshot["worldSurface"],
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
    quests: projected.quests ?? legacy.quests,
    activeQuests: projected.activeQuests ?? legacy.activeQuests,
    availableQuests: projected.availableQuests ?? legacy.availableQuests,
    completedQuestIds: projected.completedQuestIds ?? legacy.completedQuestIds,
    npcDialogues: projected.npcDialogues ?? legacy.npcDialogues,
    npcReputations: projected.npcReputations ?? legacy.npcReputations,
    npcMemories: projected.npcMemories ?? legacy.npcMemories,
    npcRumors: projected.npcRumors ?? legacy.npcRumors,
    skills: projected.skills ?? legacy.skills,
    resources: projected.resources ?? legacy.resources,
    inventory: projected.inventory ?? legacy.inventory,
    equipment: projected.equipment ?? legacy.equipment,
    worldSurface: projected.worldSurface ?? legacy.worldSurface,
  };
}

function pickSnapshotPayload(data: unknown): unknown {
  const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

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

  if (raw.liveGameplaySnapshot && typeof raw.liveGameplaySnapshot === "object") {
    return projectComposerSnapshot(raw.liveGameplaySnapshot as Record<string, unknown>);
  }

  if (raw.schemaVersion === "live-gameplay-snapshot.v1") {
    return projectComposerSnapshot(raw);
  }

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
  private snapshot: LiveGameplaySnapshot = normalizeLiveGameplaySnapshot(EMPTY_LIVE_GAMEPLAY_SNAPSHOT);
  private readonly listeners = new Set<Listener>();

  getSnapshot(): LiveGameplaySnapshot {
    return this.snapshot;
  }

  setSnapshot(next: unknown): void {
    this.snapshot = normalizeLiveGameplaySnapshot(pickSnapshotPayload(next) as Partial<LiveGameplaySnapshot>);
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

  subscribe(listener: () => void): () => void {
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

export const DEFAULT_GAMEPLAY_PLAYER_ID = getDefaultGameplayPlayerId();

export async function fetchGameplaySnapshot(
  playerId: string = getDefaultGameplayPlayerId()
): Promise<LiveGameplaySnapshot | null> {
  try {
    const position = readPlayerPositionBridge();
    const queryParams = new URLSearchParams({ playerId });

    if (position) {
      queryParams.set("px", String(Math.round(position.x)));
      queryParams.set("py", String(Math.round(position.z ?? position.y ?? position.x)));
    }

    const response = await fetch(
      `/api/gameplay/snapshot?${queryParams.toString()}`,
      {
        cache: "no-store",
        headers: {
          "x-player-id": playerId,
        },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return normalizeLiveGameplaySnapshot(pickSnapshotPayload(data) as Partial<LiveGameplaySnapshot>);
  } catch {
    return null;
  }
}

export async function requestGameplaySnapshot(): Promise<LiveGameplaySnapshot> {
  const snapshot = await fetchGameplaySnapshot();
  if (snapshot) {
    liveGameplayStore.setSnapshot(snapshot);
    return liveGameplayStore.getSnapshot();
  }
  return liveGameplayStore.getSnapshot();
}
