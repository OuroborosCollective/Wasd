import {
  normalizeLiveGameplaySnapshot,
  type LiveGameplaySnapshot,
  type NpcDialogueSnapshot,
  type NpcMemorySnapshot,
  type NpcQuestObjectiveSnapshot,
  type NpcQuestProgressSnapshot,
  type NpcReputationSnapshot,
  type NpcRumorSnapshot,
} from './liveGameplaySnapshot';
import { EMPTY_WORLD_SURFACE_SNAPSHOT, normalizeWorldSurfaceSnapshot, type WorldSurfaceSnapshot } from './worldSurface';

export type LiveGameplaySnapshotWithWorldSurface = LiveGameplaySnapshot & {
  readonly worldSurface: WorldSurfaceSnapshot;
};

type WorldSurfaceInput = Partial<LiveGameplaySnapshot> & {
  readonly worldSurface?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
    .sort((a, b) => a.localeCompare(b));
}

function normalizeNpcQuestObjective(input: unknown): NpcQuestObjectiveSnapshot | null {
  if (!isRecord(input) || typeof input.objectiveId !== 'string') return null;

  const required = Math.max(1, Math.floor(Number(input.required ?? 1)));
  const current = Math.max(0, Math.min(required, Math.floor(Number(input.current ?? 0))));

  return {
    objectiveId: input.objectiveId,
    title: String(input.title ?? input.objectiveId),
    current,
    required,
    completed: Boolean(input.completed ?? current >= required),
  };
}

function normalizeNpcQuestProgress(input: unknown): NpcQuestProgressSnapshot | null {
  if (!isRecord(input) || typeof input.questId !== 'string') return null;

  const validStates = new Set(['available', 'active', 'ready_to_complete', 'completed']);
  const state = typeof input.state === 'string' && validStates.has(input.state)
    ? input.state as NpcQuestProgressSnapshot['state']
    : 'active';

  return {
    questId: input.questId,
    state,
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
    'quest_available',
    'quest_active_missing_wood',
    'quest_active_ready_to_process',
    'quest_active_ready_to_sell',
    'quest_ready_to_complete',
    'quest_completed',
  ]);

  if (!Array.isArray(input)) return [];

  return input
    .filter((dialogue): dialogue is Record<string, unknown> => isRecord(dialogue) && typeof dialogue.npcId === 'string')
    .map((dialogue) => ({
      npcId: dialogue.npcId as string,
      displayName: String(dialogue.displayName ?? dialogue.npcId),
      dialogueState: typeof dialogue.dialogueState === 'string' && validStates.has(dialogue.dialogueState)
        ? dialogue.dialogueState as NpcDialogueSnapshot['dialogueState']
        : 'quest_available',
      line: String(dialogue.line ?? ''),
      availableQuestIds: normalizeStringArray(dialogue.availableQuestIds),
      activeQuestIds: normalizeStringArray(dialogue.activeQuestIds),
      completedQuestIds: normalizeStringArray(dialogue.completedQuestIds),
    }))
    .sort((a, b) => a.npcId.localeCompare(b.npcId));
}

function normalizeNpcReputations(input: unknown): NpcReputationSnapshot[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((rep): rep is Record<string, unknown> => isRecord(rep) && typeof rep.npcId === 'string')
    .map((rep) => ({
      npcId: rep.npcId as string,
      playerId: String(rep.playerId ?? 'unknown'),
      reputation: Math.floor(Number(rep.reputation ?? 0)),
      completedQuestIds: normalizeStringArray(rep.completedQuestIds),
    }))
    .sort((a, b) => a.npcId.localeCompare(b.npcId));
}

function normalizeNpcMemories(input: unknown): NpcMemorySnapshot[] {
  const validTrustTiers = new Set(['hostile', 'cold', 'neutral', 'trusted', 'honored']);
  if (!Array.isArray(input)) return [];

  return input
    .filter((memory): memory is Record<string, unknown> => isRecord(memory) && typeof memory.npcId === 'string')
    .map((memory) => ({
      npcId: memory.npcId as string,
      playerId: String(memory.playerId ?? 'unknown'),
      reputation: Math.floor(Number(memory.reputation ?? 0)),
      trustTier: typeof memory.trustTier === 'string' && validTrustTiers.has(memory.trustTier)
        ? memory.trustTier as NpcMemorySnapshot['trustTier']
        : 'neutral',
      memoryEventCount: Math.max(0, Math.floor(Number(memory.memoryEventCount ?? 0))),
      recentMemoryNotes: normalizeStringArray(memory.recentMemoryNotes),
      knownRumorCount: Math.max(0, Math.floor(Number(memory.knownRumorCount ?? 0))),
    }))
    .sort((a, b) => a.npcId.localeCompare(b.npcId));
}

function normalizeNpcRumors(input: unknown): NpcRumorSnapshot[] {
  const validKinds = new Set(['helped_village', 'reliable_supplier', 'troublemaker', 'hostile_actor', 'trusted_worker']);
  if (!Array.isArray(input)) return [];

  return input
    .filter((rumor): rumor is Record<string, unknown> => isRecord(rumor) && typeof rumor.rumorId === 'string')
    .map((rumor) => ({
      rumorId: rumor.rumorId as string,
      npcId: String(rumor.npcId ?? ''),
      playerId: String(rumor.playerId ?? 'unknown'),
      kind: typeof rumor.kind === 'string' && validKinds.has(rumor.kind)
        ? rumor.kind as NpcRumorSnapshot['kind']
        : 'helped_village',
      weight: Math.max(0, Math.floor(Number(rumor.weight ?? 0))),
      note: String(rumor.note ?? ''),
      sourceNpcId: String(rumor.sourceNpcId ?? ''),
    }))
    .sort((a, b) => a.rumorId.localeCompare(b.rumorId));
}

export function normalizeLiveGameplaySnapshotWithWorldSurface(input: WorldSurfaceInput | null | undefined): LiveGameplaySnapshotWithWorldSurface {
  const base = normalizeLiveGameplaySnapshot(input);
  const surface = isRecord(input) ? normalizeWorldSurfaceSnapshot(input.worldSurface) : EMPTY_WORLD_SURFACE_SNAPSHOT;

  if (!isRecord(input)) {
    return Object.freeze({ ...base, worldSurface: surface });
  }

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
