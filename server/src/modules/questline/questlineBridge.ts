// @ts-nocheck
/**
 * Bridges procedural questline packs into QuestEngine definitions + player runtime,
 * and syncs FeatureTrigger satisfaction on quest completion (via QuestEngine hook).
 */

import type { QuestEngine } from "../quest/QuestEngine.js";

/** Filled by `registerProceduralQuestPack` for `quest_sync` bootstrap. */
export const registeredProceduralQuestIdsByQuestline = new Map<string, string[]>();
import { satisfyFeature, type FeatureTrigger } from "./featureTrigger.js";
import type { GeneratedQuest, QuestStep, StrandQuestPack } from "./questlineGenerator.js";
import type { QuestlineRuntimeState } from "./questlineEngine.js";

type ObjectiveShape = {
  objectiveType: string;
  giverNpcId: string;
  targetNpcId?: string;
  targetId?: string;
  requiredItemId?: string;
  requiredCount?: number;
};

function mapStepToObjective(step: QuestStep): ObjectiveShape {
  const npc = step.npcId ?? "npc_guide";
  switch (step.type) {
    case "kill":
      return {
        objectiveType: "combat",
        giverNpcId: "npc_guide",
        targetId: step.targetId ?? "npc_dummy",
      };
    case "collect":
      return {
        objectiveType: "collect",
        giverNpcId: npc,
        targetNpcId: npc,
        requiredItemId: "iron_scrap",
        requiredCount: Math.min(5, Math.max(1, step.targetCount ?? 1)),
      };
    default:
      return { objectiveType: "talk_to", giverNpcId: "npc_guide", targetNpcId: npc };
  }
}

/** Build quest defs for each procedural step + side / war / pvp follow-ups. */
export function registerProceduralQuestPack(
  questSystem: QuestEngine,
  pack: StrandQuestPack,
  questlineId: string
): string[] {
  const ids: string[] = [];
  const steps = pack.mainQuest.steps;
  const n = steps.length;

  for (let i = 0; i < n; i++) {
    const step = steps[i]!;
    const id = `ql_${questlineId}_step_${i}`;
    ids.push(id);
    const prereq = i === 0 ? [] : [`ql_${questlineId}_step_${i - 1}`];
    const obj = mapStepToObjective(step);
    const featureId = step.featureTriggers[0] ?? pack.featureSchedule[i]?.featureId;
    questSystem.addQuest({
      id,
      title: step.title,
      giverNpcId: obj.giverNpcId,
      targetNpcId: obj.targetNpcId,
      targetId: obj.targetId,
      requiredItemId: obj.requiredItemId,
      requiredCount: obj.requiredCount,
      objectiveType: obj.objectiveType,
      prerequisiteQuestIds: prereq,
      reward: { gold: 5 + i * 2, xp: 15 + i * 5 },
      questlineId,
      questlineStepIndex: i,
      questlineFeatureId: featureId,
    });
  }

  const lastMainId = n > 0 ? `ql_${questlineId}_step_${n - 1}` : null;

  const registerFollow = (q: GeneratedQuest, prereq: string[]) => {
    if (!q.steps.length) return;
    const st = q.steps[0]!;
    const obj = mapStepToObjective(st);
    const featureId = st.featureTriggers[0];
    questSystem.addQuest({
      id: q.id,
      title: q.title,
      giverNpcId: obj.giverNpcId,
      targetNpcId: obj.targetNpcId,
      targetId: obj.targetId,
      requiredItemId: obj.requiredItemId,
      requiredCount: obj.requiredCount,
      objectiveType: obj.objectiveType,
      prerequisiteQuestIds: prereq,
      reward: { gold: 20, xp: 40 },
      questlineId,
      questlineStepIndex: -1,
      questlineFeatureId: featureId,
    });
    ids.push(q.id);
  };

  if (lastMainId && pack.sideQuests[0]) {
    registerFollow(pack.sideQuests[0], [lastMainId]);
    let prev = pack.sideQuests[0].id;
    for (let s = 1; s < pack.sideQuests.length; s++) {
      registerFollow(pack.sideQuests[s]!, [prev]);
      prev = pack.sideQuests[s]!.id;
    }
    const lastSide = pack.sideQuests[pack.sideQuests.length - 1]!.id;
    if (pack.warQuest) registerFollow(pack.warQuest, [lastSide]);
    if (pack.pvpQuest && pack.warQuest) registerFollow(pack.pvpQuest, [pack.warQuest.id]);
    else if (pack.pvpQuest) registerFollow(pack.pvpQuest, [lastSide]);
  } else if (lastMainId && pack.warQuest) {
    registerFollow(pack.warQuest, [lastMainId]);
    if (pack.pvpQuest) registerFollow(pack.pvpQuest, [pack.warQuest.id]);
  } else if (lastMainId && pack.pvpQuest) {
    registerFollow(pack.pvpQuest, [lastMainId]);
  }

  wireQuestlineChainNextIds(questSystem, questlineId, pack);
  registeredProceduralQuestIdsByQuestline.set(questlineId, ids);
  return ids;
}

export function ensurePlayerQuestlineState(player: any): QuestlineRuntimeState | null {
  const raw = player?.questlineRuntime;
  if (!raw || typeof raw !== "object") return null;
  return raw as QuestlineRuntimeState;
}

export function setPlayerQuestlineRuntime(player: any, state: QuestlineRuntimeState | null): void {
  if (!state) {
    delete player.questlineRuntime;
    return;
  }
  player.questlineRuntime = state;
}

/**
 * On quest completion: satisfy matching feature triggers + auto-start next chained quest.
 */
export function applyQuestCompletionToQuestline(
  player: any,
  completedRow: any,
  questDef: any,
  questSystem: QuestEngine
): string[] {
  const unlocked: string[] = [];
  const featureId = questDef?.questlineFeatureId ?? completedRow?.questlineFeatureId;
  const questlineId = questDef?.questlineId ?? completedRow?.questlineId;
  if (!questlineId) return unlocked;

  const state = ensurePlayerQuestlineState(player);
  if (!state || state.activeQuestlineId !== questlineId) return unlocked;

  if (typeof featureId === "string" && featureId) {
    satisfyFeature(state.featureSchedule, featureId);
    satisfyFeature(state.triggers, featureId);
    if (!state.unlockedFeatures.includes(featureId)) {
      state.unlockedFeatures.push(featureId);
      unlocked.push(featureId);
    }
  }

  const nextId = questDef?.questlineNextQuestId ?? completedRow?.questlineNextQuestId;
  if (typeof nextId === "string" && nextId) {
    questSystem.startQuest(player, nextId);
  }

  return unlocked;
}

/** Auto-chaining: main steps → first follow-on; sides → war → pvp */
export function wireQuestlineChainNextIds(
  questSystem: QuestEngine,
  questlineId: string,
  pack: StrandQuestPack
): void {
  const defs = questSystem.getQuestDefinitions();
  const n = pack.mainQuest.steps.length;
  const firstFollow =
    pack.sideQuests[0]?.id ?? pack.warQuest?.id ?? pack.pvpQuest?.id ?? undefined;

  for (let i = 0; i < n; i++) {
    const id = `ql_${questlineId}_step_${i}`;
    const def = defs.get(id);
    if (!def) continue;
    const next = i < n - 1 ? `ql_${questlineId}_step_${i + 1}` : firstFollow;
    (def as any).questlineNextQuestId = next;
  }

  for (let s = 0; s < pack.sideQuests.length; s++) {
    const cur = pack.sideQuests[s]!;
    const d = defs.get(cur.id);
    if (!d) continue;
    const nxt =
      pack.sideQuests[s + 1]?.id ?? pack.warQuest?.id ?? pack.pvpQuest?.id ?? undefined;
    (d as any).questlineNextQuestId = nxt;
  }

  if (pack.warQuest) {
    const d = defs.get(pack.warQuest.id);
    if (d) (d as any).questlineNextQuestId = pack.pvpQuest?.id;
  }
}

/** Complete active questline `talk_to` quests whose target NPC matches (server-side interact). */
export function tryCompleteQuestlineTalkAtNpc(
  player: any,
  questSystem: QuestEngine,
  npcId: string
): string[] {
  const done: string[] = [];
  if (!npcId || !player.quests) return done;
  const quests = questSystem.getQuestDefinitions();
  for (const row of player.quests) {
    if (row.completed) continue;
    const def = quests.get(row.id);
    if (!def?.questlineId) continue;
    const obj = row.objectiveType || row.objective;
    if (obj !== "talk_to") continue;
    const target = row.targetNpcId ?? def.targetNpcId;
    if (target !== npcId) continue;
    const was = row.completed;
    questSystem.completeQuest(player, row.id);
    if (!was && row.completed) done.push(row.id);
  }
  return done;
}
