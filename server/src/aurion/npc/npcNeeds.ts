// WASD-owned legacy NPC need/goal compatibility kernel.
import { createHash } from "node:crypto";

export const npcNeedKeys = ["safety", "resources", "belonging", "status", "wealth", "power"] as const;
export type NpcNeedKey = (typeof npcNeedKeys)[number];
export type NpcNeedState = Readonly<Record<NpcNeedKey, number>>;

export type NpcNeedEvent = {
  id: string;
  need: NpcNeedKey;
  delta: number;
  sourceReceiptId: string;
  resolutionIndex: number;
};

export type NpcGoal = "seek_safety" | "gather_resources" | "socialize" | "gain_reputation" | "trade" | "expand_influence";

export type NpcDecision = {
  npcId: string;
  goal: NpcGoal;
  needs: NpcNeedState;
  observationIds: readonly string[];
  decisionHash: string;
  resolutionIndex: number;
};

const needGoal: Readonly<Record<NpcNeedKey, NpcGoal>> = {
  safety: "seek_safety",
  resources: "gather_resources",
  belonging: "socialize",
  status: "gain_reputation",
  wealth: "trade",
  power: "expand_influence",
};

const needTieOrder: readonly NpcNeedKey[] = ["safety", "resources", "belonging", "status", "wealth", "power"];

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 10_000) / 10_000));
}

function clampSigned(value: number): number {
  return Math.max(-1, Math.min(1, Math.round(value * 10_000) / 10_000));
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalHash(parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f"), "utf8").digest("hex");
}

function defaultNeeds(): NpcNeedState {
  return { safety: 0.8, resources: 0.5, belonging: 0.4, status: 0.3, wealth: 0.3, power: 0.2 };
}

export function resolveNpcNeeds(input: { current?: Partial<NpcNeedState>; events: readonly NpcNeedEvent[] }): NpcNeedState {
  const next: Record<NpcNeedKey, number> = { ...defaultNeeds(), ...input.current };
  input.events.slice().sort((left, right) => left.resolutionIndex - right.resolutionIndex || compareText(left.sourceReceiptId, right.sourceReceiptId) || compareText(left.id, right.id)).forEach(event => {
    next[event.need] = clampUnit(next[event.need] + clampSigned(event.delta));
  });
  return next;
}

export function decideNpcGoal(input: { npcId: string; needs: NpcNeedState; observationIds: readonly string[]; resolutionIndex: number }): NpcDecision {
  const selectedNeed = needTieOrder.reduce((selected, candidate) => input.needs[candidate] < input.needs[selected] ? candidate : selected, needTieOrder[0]!);
  const observations = input.observationIds.slice().sort(compareText);
  const decisionHash = canonicalHash([input.npcId, String(input.resolutionIndex), selectedNeed, ...observations, ...needTieOrder.map(need => `${need}:${input.needs[need]}`)]);
  return { npcId: input.npcId, goal: needGoal[selectedNeed], needs: input.needs, observationIds: observations, decisionHash, resolutionIndex: input.resolutionIndex };
}
