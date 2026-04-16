import fs from "node:fs";
import path from "node:path";
import { resolveContentFile } from "../content/contentDataRoot.js";
import { resolveChoice, type StrandGraph } from "./strandResolver.js";
import { enrichQuestlineContext, type QuestlineSeed } from "./questlineGenerator.js";
import { createTrigger, type FeatureTrigger } from "./featureTrigger.js";

export type QuestlineRuntimeState = {
  currentNode: string;
  unlockedFeatures: string[];
  triggers: FeatureTrigger[];
  lastContext?: ReturnType<typeof enrichQuestlineContext>;
};

export type QuestlineEngineOptions = {
  seeds?: QuestlineSeed[];
};

function loadSeedsFromDisk(): QuestlineSeed[] {
  const p = resolveContentFile("questlines/mainline_seed.json");
  if (!p || !fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
    if (!Array.isArray(raw.questlines)) return [];
    return raw.questlines as QuestlineSeed[];
  } catch {
    return [];
  }
}

export class QuestlineEngine {
  private seeds = new Map<string, QuestlineSeed>();

  constructor(opts: QuestlineEngineOptions = {}) {
    const fromDisk = loadSeedsFromDisk();
    for (const s of [...fromDisk, ...(opts.seeds ?? [])]) {
      if (s?.id) this.seeds.set(s.id, s);
    }
  }

  getSeed(id: string): QuestlineSeed | undefined {
    return this.seeds.get(id);
  }

  listSeeds(): QuestlineSeed[] {
    return [...this.seeds.values()];
  }

  startQuestline(questlineId: string, playerFlags: Record<string, boolean> = {}): QuestlineRuntimeState | null {
    const seed = this.seeds.get(questlineId);
    if (!seed) return null;
    const graph = seed.graph;
    const node = graph[seed.entryNode];
    if (!node) return null;
    const triggers: FeatureTrigger[] = [];
    for (const fid of node.featureTriggers ?? []) {
      triggers.push(createTrigger(fid, node.id, "introduce"));
    }
    return {
      currentNode: seed.entryNode,
      unlockedFeatures: [],
      triggers,
      lastContext: enrichQuestlineContext(seed),
    };
  }

  choose(
    state: QuestlineRuntimeState,
    questlineId: string,
    choiceId: string,
    playerFlags: Record<string, boolean>
  ): QuestlineRuntimeState | { error: string } {
    const seed = this.seeds.get(questlineId);
    if (!seed) return { error: "unknown_questline" };
    const res = resolveChoice(seed.graph, state.currentNode, choiceId, playerFlags);
    if (!res.ok) return { error: res.reason };
    const next = seed.graph[res.nextNode];
    const triggers = [...state.triggers];
    for (const fid of next?.featureTriggers ?? []) {
      triggers.push(createTrigger(fid, next.id, "unlock"));
    }
    return {
      ...state,
      currentNode: res.nextNode,
      triggers,
      lastContext: enrichQuestlineContext(seed),
    };
  }

  exportGraph(questlineId: string): StrandGraph | null {
    return this.seeds.get(questlineId)?.graph ?? null;
  }
}
