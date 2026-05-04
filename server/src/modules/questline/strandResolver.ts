// @ts-nocheck
/**
 * Resolves branch choices (Scheideweg) in a questline graph.
 */

export type StrandChoice = {
  id: string;
  label: string;
  nextNode: string;
  requiresFlags?: string[];
};

export type StrandNode = {
  id: string;
  title: string;
  text: string;
  choices: StrandChoice[];
  featureTriggers?: string[];
};

export type StrandGraph = Record<string, StrandNode>;

export function resolveChoice(
  graph: StrandGraph,
  currentNodeId: string,
  choiceId: string,
  playerFlags: Record<string, boolean>
): { ok: true; nextNode: string } | { ok: false; reason: string } {
  const node = graph[currentNodeId];
  if (!node) return { ok: false, reason: "unknown_node" };
  const choice = node.choices.find((c) => c.id === choiceId);
  if (!choice) return { ok: false, reason: "unknown_choice" };
  for (const f of choice.requiresFlags ?? []) {
    if (!playerFlags[f]) return { ok: false, reason: `missing_flag:${f}` };
  }
  return { ok: true, nextNode: choice.nextNode };
}
