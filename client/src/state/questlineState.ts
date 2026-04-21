/** Server-driven questline graph + feature unlocks (WebSocket `questline_state` / `questline_features`). */

export type QuestlineStateSnapshot = {
  questlineId: string;
  currentNode: string;
  unlockedFeatures: string[];
  featureSchedule: Array<{ featureId: string; satisfied: boolean; questStepId?: string }>;
};

let snapshot: QuestlineStateSnapshot | null = null;
const listeners = new Set<() => void>();

export function subscribeQuestlineState(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit() {
  listeners.forEach((cb) => cb());
}

export function applyQuestlineState(data: {
  questlineId?: string;
  currentNode?: string;
  unlockedFeatures?: string[];
  featureSchedule?: unknown[];
}): void {
  const questlineId = typeof data.questlineId === "string" ? data.questlineId : "";
  if (!questlineId) return;
  const featureSchedule = Array.isArray(data.featureSchedule)
    ? data.featureSchedule.map((row: any) => ({
        featureId: String(row?.featureId ?? ""),
        satisfied: Boolean(row?.satisfied),
        questStepId: typeof row?.questStepId === "string" ? row.questStepId : undefined,
      }))
    : [];
  snapshot = {
    questlineId,
    currentNode: typeof data.currentNode === "string" ? data.currentNode : "",
    unlockedFeatures: Array.isArray(data.unlockedFeatures) ? [...data.unlockedFeatures] : [],
    featureSchedule,
  };
  emit();
}

export function applyQuestlineFeatures(data: { unlocked?: string[]; questlineId?: string }): string[] {
  const unlocked = Array.isArray(data.unlocked) ? data.unlocked.filter((x) => typeof x === "string") : [];
  if (snapshot && (!data.questlineId || data.questlineId === snapshot.questlineId)) {
    for (const f of unlocked) {
      if (!snapshot.unlockedFeatures.includes(f)) snapshot.unlockedFeatures.push(f);
      const row = snapshot.featureSchedule.find((r) => r.featureId === f);
      if (row) row.satisfied = true;
    }
    emit();
  }
  return unlocked;
}

export function getQuestlineSnapshot(): QuestlineStateSnapshot | null {
  return snapshot;
}
