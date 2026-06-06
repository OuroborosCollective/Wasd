import { HeuristicGoalPruner, type GoalLike } from "./HeuristicGoalPruner.js";
import type { NPC } from "./NPCSystem.js";

export interface NPCGoalPruningRuntimeReport {
  npcId: string;
  before: number;
  after: number;
  removed: number;
  reason: string;
}

function finite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function npcDangerLevel(npc: NPC): number {
  const hp = finite(npc.health, 100);
  const maxHp = Math.max(1, finite(npc.maxHealth, 100));
  const missingHp = Math.max(0, 1 - hp / maxHp);
  const aggression = finite(npc.traits?.aggression, 0.5);
  return Math.max(0, Math.min(100, Math.trunc((missingHp * 70 + aggression * 30) * 100) / 100));
}

function npcEnergy(npc: NPC): number {
  if (Number.isFinite(Number(npc.stamina))) return Math.max(0, Math.min(100, Number(npc.stamina)));
  const energy = finite(npc.energyState?.currentEnergy, 1000);
  const maxEnergy = Math.max(1, finite(npc.energyState?.maxEnergy, 1000));
  return Math.max(0, Math.min(100, Math.trunc((energy / maxEnergy) * 100)));
}

function asGoalList(npc: NPC): GoalLike[] {
  const memory = npc.memory as { longTermGoals?: unknown } | undefined;
  return Array.isArray(memory?.longTermGoals) ? memory.longTermGoals as GoalLike[] : [];
}

export function pruneNPCGoalsForTick(npc: NPC, tick: number): NPCGoalPruningRuntimeReport | null {
  const goals = asGoalList(npc);
  if (goals.length === 0) return null;

  const result = HeuristicGoalPruner.pruneGoals(goals, {
    tick,
    maxGoals: 8,
    minScore: -50,
    npcEnergy: npcEnergy(npc),
    dangerLevel: npcDangerLevel(npc),
    knownInvalidTargets: new Set<string>(),
  });

  if (!npc.memory || typeof npc.memory !== "object") npc.memory = {};
  (npc.memory as { longTermGoals?: GoalLike[] }).longTermGoals = result.kept;
  (npc.memory as { lastGoalPrune?: unknown }).lastGoalPrune = {
    tick,
    kept: result.kept.length,
    removed: result.removed.length,
    reasons: result.removed.map((entry) => entry.reason).sort(),
  };

  return {
    npcId: npc.id,
    before: goals.length,
    after: result.kept.length,
    removed: result.removed.length,
    reason: result.removed.length > 0 ? "pruned" : "stable",
  };
}

export function pruneAllNPCGoalsForTick(npcs: readonly NPC[], tick: number): NPCGoalPruningRuntimeReport[] {
  return [...npcs]
    .sort((a, b) => String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0)
    .map((npc) => pruneNPCGoalsForTick(npc, tick))
    .filter((entry): entry is NPCGoalPruningRuntimeReport => entry !== null);
}
