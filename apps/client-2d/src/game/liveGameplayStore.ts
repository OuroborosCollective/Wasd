import {
  EMPTY_LIVE_GAMEPLAY_SNAPSHOT,
} from "./liveGameplaySnapshot";
import {
  normalizeLiveGameplaySnapshotWithWorldSurface as normalizeLiveGameplaySnapshot,
  type LiveGameplaySnapshotWithWorldSurface as LiveGameplaySnapshot,
} from "./liveGameplayWorldSurfaceSnapshot";

type Listener = () => void;

type SnapshotEvidence = {
  readonly playerId: string;
  readonly serverTick: number;
  readonly revisionHash: string;
};

type EvidencedSnapshot = LiveGameplaySnapshot & {
  readonly runtimePlayerId?: string;
  readonly revisionHash?: string;
};

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
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
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
    // The deterministic runtime ID remains usable when storage is unavailable.
  }
  return playerId;
}

export function getDefaultGameplayPlayerId(): string {
  return safeStoredValue(GAMEPLAY_PLAYER_ID_KEY) ?? safeStoredValue(PUBLIC_KEY_KEY) ?? resolveAnonymousGameplayPlayerId();
}

function validPlayerId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9._:-]{1,160}$/.test(value);
}

function validTick(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function validRevision(value: unknown): value is string {
  return typeof value === "string" && /^[a-fA-F0-9]{6,128}$/.test(value);
}

function questStatusFromComposerState(state: unknown): LiveGameplaySnapshot["quests"][number]["status"] {
  if (state === "available" || state === "active" || state === "completed") return state;
  if (state === "ready_to_complete") return "active";
  return "locked";
}

function normalizeComposerObjective(
  input: ComposerQuestObjective,
): LiveGameplaySnapshot["quests"][number]["objectives"][number] | null {
  const objectiveId = typeof input.objectiveId === "string" && input.objectiveId.trim()
    ? input.objectiveId.trim()
    : null;
  if (!objectiveId) return null;
  const requiredRaw = Number(input.required);
  const currentRaw = Number(input.current);
  if (!Number.isFinite(requiredRaw) || requiredRaw < 1 || !Number.isFinite(currentRaw) || currentRaw < 0) return null;
  const required = Math.floor(requiredRaw);
  const current = Math.min(required, Math.floor(currentRaw));
  return {
    id: objectiveId,
    label: String(input.title ?? prettifyId(objectiveId)),
    current,
    required,
    completed: input.completed === true,
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
): void {
  if (!Array.isArray(input)) return;
  for (const rawQuest of input) {
    const quest = projectComposerQuest(rawQuest as ComposerQuestProgress);
    if (!quest || seenQuestIds.has(quest.id)) continue;
    seenQuestIds.add(quest.id);
    output.push(quest);
  }
}

function projectComposerQuests(input: Record<string, unknown>): LiveGameplaySnapshot["quests"] {
  const output: LiveGameplaySnapshot["quests"] = [];
  const seenQuestIds = new Set<string>();
  appendComposerQuestList(output, seenQuestIds, input.quests);
  appendComposerQuestList(output, seenQuestIds, input.activeQuests);
  appendComposerQuestList(output, seenQuestIds, input.availableQuests);
  if (Array.isArray(input.completedQuestIds)) {
    for (const rawQuestId of input.completedQuestIds) {
      if (typeof rawQuestId !== "string") continue;
      const questId = rawQuestId.trim();
      if (!questId || seenQuestIds.has(questId)) continue;
      seenQuestIds.add(questId);
      output.push({ id: questId, title: prettifyId(questId), description: "", status: "completed", objectives: [] });
    }
  }
  return output.sort((a, b) => a.id.localeCompare(b.id));
}

function copyArrayField(input: unknown): unknown[] {
  return Array.isArray(input) ? [...input] : [];
}

function evidenceFromRecord(input: Record<string, unknown>): SnapshotEvidence | null {
  const playerId = input.playerId ?? input.runtimePlayerId;
  const serverTick = input.logicalIndex ?? input.serverTick;
  const revisionHash = input.revisionHash;
  if (!validPlayerId(playerId) || !validTick(serverTick) || !validRevision(revisionHash)) return null;
  return { playerId, serverTick, revisionHash };
}

function hasCompleteComposerCore(input: Record<string, unknown>): boolean {
  return Array.isArray(input.inventory) &&
    Array.isArray(input.equipment) &&
    Array.isArray(input.skills) &&
    Array.isArray(input.resourceNodes) &&
    Boolean(input.wallet && typeof input.wallet === "object");
}

function projectComposerSnapshot(input: Record<string, unknown>): Partial<LiveGameplaySnapshot> & Record<string, unknown> {
  const evidence = evidenceFromRecord(input);
  const coreComplete = hasCompleteComposerCore(input);
  const playerId = evidence?.playerId ?? "unknown";
  const inventory = Array.isArray(input.inventory) ? input.inventory : [];
  const equipment = Array.isArray(input.equipment) ? input.equipment : [];
  const skills = Array.isArray(input.skills) ? input.skills : [];
  const resourceNodes = Array.isArray(input.resourceNodes) ? input.resourceNodes : [];
  const wallet = input.wallet && typeof input.wallet === "object" ? input.wallet as Record<string, unknown> : {};

  return {
    status: evidence && coreComplete ? "live" : "stale",
    serverTick: evidence?.serverTick ?? null,
    runtimePlayerId: evidence?.playerId,
    revisionHash: evidence?.revisionHash,
    quests: projectComposerQuests(input),
    activeQuests: copyArrayField(input.activeQuests) as LiveGameplaySnapshot["activeQuests"],
    availableQuests: copyArrayField(input.availableQuests) as LiveGameplaySnapshot["availableQuests"],
    completedQuestIds: copyArrayField(input.completedQuestIds) as LiveGameplaySnapshot["completedQuestIds"],
    npcDialogues: copyArrayField(input.npcDialogues) as LiveGameplaySnapshot["npcDialogues"],
    npcReputations: copyArrayField(input.npcReputations) as LiveGameplaySnapshot["npcReputations"],
    npcMemories: copyArrayField(input.npcMemories) as LiveGameplaySnapshot["npcMemories"],
    npcRumors: copyArrayField(input.npcRumors) as LiveGameplaySnapshot["npcRumors"],
    skills: skills.map((skill: any) => {
      const id = String(skill.skillId ?? skill.id ?? "unknown");
      return {
        id,
        title: prettifyId(id),
        level: Number(skill.level),
        xp: Number(skill.xp),
        xpForNextLevel: Number(skill.xpForNextLevel),
        progressRatio: Number(skill.progressRatio),
      };
    }) as LiveGameplaySnapshot["skills"],
    resources: resourceNodes.map((node: any) => {
      const skillId = String(node.skillId ?? "unknown");
      const resourceId = String(node.resourceId ?? node.itemRewardId ?? "unknown");
      return {
        id: String(node.nodeId ?? ""),
        kind: skillId === "fishing" ? "fish_spot" : skillId === "mining" ? "ore" : "tree",
        title: prettifyId(resourceId),
        skillId,
        requiredLevel: Number(node.requiredLevel),
        xpReward: Number(node.xpReward),
        itemRewardId: resourceId,
        itemRewardName: prettifyId(resourceId),
        position: { x: Number(node.x), y: Number(node.y) },
        radius: Number(node.radius),
        status: node.available === true ? "available" : node.available === false ? "depleted" : "locked",
        depletedUntilTick: typeof node.depletedUntilTick === "number" ? node.depletedUntilTick : null,
        remainingTicks: Number(node.remainingTicks),
      };
    }) as LiveGameplaySnapshot["resources"],
    inventory: {
      playerId,
      schemaVersion: 1,
      capacity: Number((input.inventoryState as any)?.capacity ?? 32),
      slots: inventory.map((item: any) => {
        const itemId = String(item.itemId ?? item.id ?? "unknown_item");
        return {
          slotId: String(item.slotId ?? `slot_${itemId}`),
          itemId,
          name: String(item.name ?? prettifyId(itemId)),
          quantity: Number(item.quantity ?? item.count),
          category: item.category ?? "resource",
          stackable: item.stackable !== false,
          maxStack: Number(item.maxStack ?? 999),
        };
      }),
    },
    equipment: {
      playerId,
      schemaVersion: 1,
      slots: equipment.map((slot: any) => ({
        slotId: String(slot.slot ?? slot.slotId ?? "unknown_slot"),
        itemId: String(slot.itemId ?? ""),
        title: String(slot.title ?? prettifyId(String(slot.itemId ?? "unknown"))),
        tier: Number(slot.tier),
      })),
    },
    wallet: { coin: Number(wallet.coin) },
    worldPois: copyArrayField(input.worldPois) as LiveGameplaySnapshot["worldPois"],
    vendorEconomy: input.vendorEconomy as LiveGameplaySnapshot["vendorEconomy"],
    campNpcs: copyArrayField(input.campNpcs) as LiveGameplaySnapshot["campNpcs"],
    campStocks: copyArrayField(input.campStocks) as LiveGameplaySnapshot["campStocks"],
    processingStations: copyArrayField(input.processingStations) as LiveGameplaySnapshot["processingStations"],
    discoveryStats: input.discoveryStats as LiveGameplaySnapshot["discoveryStats"],
    recentDiscoveries: copyArrayField(input.recentDiscoveries) as LiveGameplaySnapshot["recentDiscoveries"],
    worldSurface: input.worldSurface as LiveGameplaySnapshot["worldSurface"],
  };
}

function mergeComposerIntoLegacy(
  legacy: Record<string, unknown>,
  composer: Record<string, unknown>,
): Record<string, unknown> {
  const projected = projectComposerSnapshot(composer) as Record<string, unknown>;
  return {
    ...legacy,
    ...projected,
    paperdoll: legacy.paperdoll,
    character: legacy.character,
    crafting: legacy.crafting,
    guild: legacy.guild,
    factions: legacy.factions,
    map: legacy.map,
  };
}

function pickSnapshotPayload(data: unknown): Record<string, unknown> {
  const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const envelopeEvidence = {
    playerId: raw.playerId,
    serverTick: raw.serverTick,
    revisionHash: raw.revisionHash,
  };
  let selected: Record<string, unknown>;
  if (raw.snapshot && typeof raw.snapshot === "object" && raw.liveGameplaySnapshot && typeof raw.liveGameplaySnapshot === "object") {
    selected = mergeComposerIntoLegacy(raw.snapshot as Record<string, unknown>, raw.liveGameplaySnapshot as Record<string, unknown>);
  } else if (raw.liveGameplaySnapshot && typeof raw.liveGameplaySnapshot === "object") {
    selected = projectComposerSnapshot(raw.liveGameplaySnapshot as Record<string, unknown>) as Record<string, unknown>;
  } else if (raw.schemaVersion === "live-gameplay-snapshot.v1") {
    selected = projectComposerSnapshot(raw) as Record<string, unknown>;
  } else if (raw.snapshot && typeof raw.snapshot === "object") {
    const snapshot = raw.snapshot as Record<string, unknown>;
    selected = snapshot.schemaVersion === "live-gameplay-snapshot.v1"
      ? projectComposerSnapshot(snapshot) as Record<string, unknown>
      : snapshot;
  } else {
    selected = raw;
  }
  return {
    ...selected,
    runtimePlayerId: selected.runtimePlayerId ?? selected.playerId ?? envelopeEvidence.playerId,
    serverTick: selected.serverTick ?? selected.logicalIndex ?? envelopeEvidence.serverTick,
    revisionHash: selected.revisionHash ?? envelopeEvidence.revisionHash,
  };
}

function normalizeCandidate(data: unknown): { snapshot: EvidencedSnapshot; evidence: SnapshotEvidence | null } {
  const picked = pickSnapshotPayload(data);
  const evidence = evidenceFromRecord({
    playerId: picked.runtimePlayerId ?? picked.playerId,
    serverTick: picked.serverTick,
    revisionHash: picked.revisionHash,
  });
  const normalized = normalizeLiveGameplaySnapshot(picked as Partial<LiveGameplaySnapshot>) as EvidencedSnapshot;
  const snapshot = Object.assign({}, normalized, {
    status: evidence && picked.status === "live" ? "live" : picked.status === "waiting" ? "waiting" : "stale",
    runtimePlayerId: evidence?.playerId,
    revisionHash: evidence?.revisionHash,
  }) as EvidencedSnapshot;
  return { snapshot, evidence };
}

export class LiveGameplayStore {
  private snapshot: EvidencedSnapshot = normalizeLiveGameplaySnapshot(EMPTY_LIVE_GAMEPLAY_SNAPSHOT) as EvidencedSnapshot;
  private evidence: SnapshotEvidence | null = null;
  private readonly listeners = new Set<Listener>();

  public getSnapshot(): LiveGameplaySnapshot {
    return this.snapshot;
  }

  public setSnapshot(next: unknown, expectedPlayerId: string = getDefaultGameplayPlayerId()): void {
    const candidate = normalizeCandidate(next);
    if (!candidate.evidence || candidate.evidence.playerId !== expectedPlayerId) {
      this.markStale();
      return;
    }
    if (this.evidence && candidate.evidence.serverTick < this.evidence.serverTick) {
      this.markStale();
      return;
    }
    if (
      this.evidence &&
      candidate.evidence.serverTick === this.evidence.serverTick &&
      candidate.evidence.revisionHash !== this.evidence.revisionHash
    ) {
      this.markStale();
      return;
    }
    this.evidence = candidate.evidence;
    this.snapshot = candidate.snapshot;
    this.emit();
  }

  public markStale(): void {
    if (this.snapshot.status === "stale") return;
    this.snapshot = Object.assign({}, this.snapshot, { status: "stale" }) as EvidencedSnapshot;
    this.emit();
  }

  public updateFromNetworkPacket(packet: unknown): void {
    const detail = packet as Record<string, unknown>;
    const type = detail?.type as string ?? detail?.event as string;
    const payload = detail?.payload as Record<string, unknown> ?? detail;
    if (
      type === "gameplay_snapshot" ||
      type === "GAMEPLAY_SNAPSHOT" ||
      type === "world_snapshot" ||
      type === "WORLD_SNAPSHOT" ||
      (payload && typeof payload === "object" && payload.schemaVersion === "live-gameplay-snapshot.v1")
    ) {
      this.setSnapshot(payload);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

export const liveGameplayStore = new LiveGameplayStore();
export const DEFAULT_GAMEPLAY_PLAYER_ID = getDefaultGameplayPlayerId();

export async function fetchGameplaySnapshot(
  playerId: string = getDefaultGameplayPlayerId(),
): Promise<EvidencedSnapshot | null> {
  try {
    const response = await fetch("/api/gameplay/snapshot", {
      cache: "no-store",
      headers: { "x-player-id": playerId },
    });
    if (!response.ok) return null;
    const candidate = normalizeCandidate(await response.json());
    if (!candidate.evidence || candidate.evidence.playerId !== playerId || candidate.snapshot.status !== "live") return null;
    return candidate.snapshot;
  } catch {
    return null;
  }
}

export async function requestGameplaySnapshot(): Promise<LiveGameplaySnapshot> {
  const playerId = getDefaultGameplayPlayerId();
  const snapshot = await fetchGameplaySnapshot(playerId);
  if (!snapshot) {
    liveGameplayStore.markStale();
    return liveGameplayStore.getSnapshot();
  }
  liveGameplayStore.setSnapshot(snapshot, playerId);
  return liveGameplayStore.getSnapshot();
}
