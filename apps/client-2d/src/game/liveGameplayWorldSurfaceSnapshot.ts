import {
  normalizeLiveGameplaySnapshot,
  type LiveGameplaySnapshot,
  type NpcDialogueSnapshot,
  type NpcMemorySnapshot,
  type NpcQuestObjectiveSnapshot,
  type NpcQuestProgressSnapshot,
  type NpcReputationSnapshot,
  type NpcRumorSnapshot,
} from "./liveGameplaySnapshot";
import {
  EMPTY_WORLD_SURFACE_SNAPSHOT,
  normalizeWorldSurfaceSnapshot,
  type WorldSurfaceSnapshot,
} from "./worldSurface";

export type LiveGameplaySnapshotWithWorldSurface = LiveGameplaySnapshot & {
  readonly worldSurface: WorldSurfaceSnapshot;
};

type WorldSurfaceInput = Partial<LiveGameplaySnapshot> & {
  readonly worldSurface?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .sort((a, b) => a.localeCompare(b));
}

function normalizeNpcQuestObjective(input: unknown): NpcQuestObjectiveSnapshot | null {
  if (!isRecord(input) || typeof input.objectiveId !== "string") return null;
  const required = Number(input.required);
  const current = Number(input.current);
  if (!Number.isSafeInteger(required) || required < 1 || !Number.isSafeInteger(current) || current < 0) return null;
  return {
    objectiveId: input.objectiveId,
    title: typeof input.title === "string" ? input.title : input.objectiveId,
    current: Math.min(required, current),
    required,
    completed: input.completed === true,
  };
}

function normalizeNpcQuestProgress(input: unknown): NpcQuestProgressSnapshot | null {
  if (!isRecord(input) || typeof input.questId !== "string") return null;
  const validStates = new Set(["available", "active", "ready_to_complete", "completed"]);
  if (typeof input.state !== "string" || !validStates.has(input.state)) return null;
  return {
    questId: input.questId,
    state: input.state as NpcQuestProgressSnapshot["state"],
    objectives: Array.isArray(input.objectives)
      ? input.objectives
          .map(normalizeNpcQuestObjective)
          .filter((objective): objective is NpcQuestObjectiveSnapshot => objective !== null)
          .sort((a, b) => a.objectiveId.localeCompare(b.objectiveId))
      : [],
  };
}

function normalizeNpcQuestProgressList(input: unknown): NpcQuestProgressSnapshot[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(normalizeNpcQuestProgress)
    .filter((quest): quest is NpcQuestProgressSnapshot => quest !== null)
    .sort((a, b) => a.questId.localeCompare(b.questId));
}

function normalizeNpcDialogues(input: unknown): NpcDialogueSnapshot[] {
  const validStates = new Set([
    "quest_available",
    "quest_active_missing_wood",
    "quest_active_ready_to_process",
    "quest_active_ready_to_sell",
    "quest_ready_to_complete",
    "quest_completed",
  ]);
  if (!Array.isArray(input)) return [];
  return input
    .filter((dialogue): dialogue is Record<string, unknown> =>
      isRecord(dialogue) &&
      typeof dialogue.npcId === "string" &&
      typeof dialogue.dialogueState === "string" &&
      validStates.has(dialogue.dialogueState) &&
      typeof dialogue.line === "string",
    )
    .map((dialogue) => ({
      npcId: dialogue.npcId as string,
      displayName: typeof dialogue.displayName === "string" ? dialogue.displayName : dialogue.npcId as string,
      dialogueState: dialogue.dialogueState as NpcDialogueSnapshot["dialogueState"],
      line: dialogue.line as string,
      availableQuestIds: normalizeStringArray(dialogue.availableQuestIds),
      activeQuestIds: normalizeStringArray(dialogue.activeQuestIds),
      completedQuestIds: normalizeStringArray(dialogue.completedQuestIds),
    }))
    .sort((a, b) => a.npcId.localeCompare(b.npcId));
}

function normalizeNpcReputations(input: unknown): NpcReputationSnapshot[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((rep): rep is Record<string, unknown> =>
      isRecord(rep) &&
      typeof rep.npcId === "string" &&
      typeof rep.playerId === "string" &&
      Number.isFinite(rep.reputation),
    )
    .map((rep) => ({
      npcId: rep.npcId as string,
      playerId: rep.playerId as string,
      reputation: Math.trunc(Number(rep.reputation)),
      completedQuestIds: normalizeStringArray(rep.completedQuestIds),
    }))
    .sort((a, b) => a.npcId.localeCompare(b.npcId));
}

function normalizeNpcMemories(input: unknown): NpcMemorySnapshot[] {
  const validTrustTiers = new Set(["hostile", "cold", "neutral", "trusted", "honored"]);
  if (!Array.isArray(input)) return [];
  return input
    .filter((memory): memory is Record<string, unknown> =>
      isRecord(memory) &&
      typeof memory.npcId === "string" &&
      typeof memory.playerId === "string" &&
      typeof memory.trustTier === "string" &&
      validTrustTiers.has(memory.trustTier) &&
      Number.isFinite(memory.reputation),
    )
    .map((memory) => ({
      npcId: memory.npcId as string,
      playerId: memory.playerId as string,
      reputation: Math.trunc(Number(memory.reputation)),
      trustTier: memory.trustTier as NpcMemorySnapshot["trustTier"],
      memoryEventCount: Math.max(0, Math.floor(Number(memory.memoryEventCount))),
      recentMemoryNotes: normalizeStringArray(memory.recentMemoryNotes),
      knownRumorCount: Math.max(0, Math.floor(Number(memory.knownRumorCount))),
    }))
    .sort((a, b) => a.npcId.localeCompare(b.npcId));
}

function normalizeNpcRumors(input: unknown): NpcRumorSnapshot[] {
  const validKinds = new Set(["helped_village", "reliable_supplier", "troublemaker", "hostile_actor", "trusted_worker"]);
  if (!Array.isArray(input)) return [];
  return input
    .filter((rumor): rumor is Record<string, unknown> =>
      isRecord(rumor) &&
      typeof rumor.rumorId === "string" &&
      typeof rumor.npcId === "string" &&
      typeof rumor.playerId === "string" &&
      typeof rumor.kind === "string" &&
      validKinds.has(rumor.kind) &&
      Number.isFinite(rumor.weight),
    )
    .map((rumor) => ({
      rumorId: rumor.rumorId as string,
      npcId: rumor.npcId as string,
      playerId: rumor.playerId as string,
      kind: rumor.kind as NpcRumorSnapshot["kind"],
      weight: Math.trunc(Number(rumor.weight)),
      note: typeof rumor.note === "string" ? rumor.note : "",
      sourceNpcId: typeof rumor.sourceNpcId === "string" ? rumor.sourceNpcId : "",
    }))
    .sort((a, b) => a.rumorId.localeCompare(b.rumorId));
}

export function normalizeLiveGameplaySnapshotWithWorldSurface(
  input: WorldSurfaceInput | null | undefined,
): LiveGameplaySnapshotWithWorldSurface {
  const base = normalizeLiveGameplaySnapshot(input);
  const surface = isRecord(input)
    ? normalizeWorldSurfaceSnapshot(input.worldSurface)
    : EMPTY_WORLD_SURFACE_SNAPSHOT;
  if (!isRecord(input)) return Object.freeze({ ...base, worldSurface: surface });
  return Object.freeze({
    ...base,
    worldSurface: surface,
    activeQuests: normalizeNpcQuestProgressList(input.activeQuests),
    availableQuests: normalizeNpcQuestProgressList(input.availableQuests),
    completedQuestIds: normalizeStringArray(input.completedQuestIds),
    npcDialogues: normalizeNpcDialogues(input.npcDialogues),
    npcReputations: normalizeNpcReputations(input.npcReputations),
    npcMemories: normalizeNpcMemories(input.npcMemories),
    npcRumors: normalizeNpcRumors(input.npcRumors),
  });
}
