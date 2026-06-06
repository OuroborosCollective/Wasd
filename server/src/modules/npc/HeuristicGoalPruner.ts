import type {
  NPCState,
  NPCLongTermGoal,
  NPCGoalType,
  NPCMemoryEvent,
  NPCRelation,
} from "../../types/npc.types.js";

import {
  filterGoalsByType,
  getTopGoal,
} from "../../types/npc.types.js";

export type { NPCState as NpcStateType, NPCGoalType as GoalType } from "../../types/npc.types.js";

export enum EchoZoneType {
  COMBAT = "COMBAT",
  COLLECT = "COLLECT",
  QUEST = "QUEST",
  TRADE = "TRADE",
  SOCIAL = "SOCIAL",
}

export interface NPCMemoryCache {
  longTermGoals: NPCLongTermGoal[];
  shortTermGoals: NPCLongTermGoal[];
  lastPruneTime: number;
  events?: NPCMemoryEvent[];
  relations?: NPCRelation[];
}

export interface Goal {
  id: string;
  type: string;
  priority: number;
  x?: number;
  y?: number;
}

export interface EchoZone {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  type: EchoZoneType;
}

export interface PruningResult {
  pruned: boolean;
  goalsRemoved: number;
  newState: NPCState;
  reason: string;
}

export type GoalLike = {
  id?: string;
  type?: string;
  kind?: string;
  priority?: number;
  urgency?: number;
  cost?: number;
  risk?: number;
  isCritical?: boolean;
  createdTick?: number;
  expiresAtTick?: number;
  targetId?: string;
  x?: number;
  y?: number;
  [key: string]: unknown;
};

export interface DeterministicGoalPruneContext {
  tick: number;
  maxGoals?: number;
  minScore?: number;
  npcEnergy?: number;
  dangerLevel?: number;
  knownInvalidTargets?: ReadonlySet<string>;
  echoIntensity?: number;
}

export interface DeterministicGoalPruneResult<TGoal extends GoalLike> {
  kept: TGoal[];
  removed: Array<{
    goal: TGoal;
    reason: "expired" | "invalid_target" | "too_expensive" | "low_score" | "overflow" | "echo_non_critical";
    score: number;
  }>;
}

const SCAN_RADIUS_SQ = 1600;
const COMBAT_INTENSITY_THRESHOLD = 0.95;
const COLLECT_INTENSITY_THRESHOLD = 0.80;
const TICK_RATE_MS = 100;

const ECHO_ZONE_GOAL_TYPES: Record<EchoZoneType, NPCGoalType[]> = {
  [EchoZoneType.COMBAT]: ["combat", "survive", "defend"],
  [EchoZoneType.COLLECT]: ["collect", "gather"],
  [EchoZoneType.QUEST]: ["quest_main", "quest_side"],
  [EchoZoneType.TRADE]: ["trade"],
  [EchoZoneType.SOCIAL]: ["social"],
};

const ECHO_ZONE_STATE_MAP: Record<EchoZoneType, NPCState> = {
  [EchoZoneType.COMBAT]: "combat",
  [EchoZoneType.COLLECT]: "collecting",
  [EchoZoneType.QUEST]: "questing",
  [EchoZoneType.TRADE]: "trading",
  [EchoZoneType.SOCIAL]: "social",
};

function stableGoalId(goal: GoalLike, index: number): string {
  const id = goal.id ?? goal.targetId ?? `${goal.type ?? goal.kind ?? "goal"}:${index}`;
  return String(id);
}

function finite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp100(value: unknown): number {
  return Math.max(0, Math.min(100, finite(value, 0)));
}

export function isInEchoZone(npcX: number, npcY: number, zone: EchoZone): boolean {
  const dx = finite(npcX) - finite(zone.x);
  const dy = finite(npcY) - finite(zone.y);
  const radius = Math.max(0, finite(zone.radius));
  return dx * dx + dy * dy < radius * radius;
}

export function isHighIntensityZone(zone: EchoZone): boolean {
  switch (zone.type) {
    case EchoZoneType.COMBAT:
      return finite(zone.intensity) >= COMBAT_INTENSITY_THRESHOLD;
    case EchoZoneType.COLLECT:
      return finite(zone.intensity) >= COLLECT_INTENSITY_THRESHOLD;
    default:
      return finite(zone.intensity) >= 0.70;
  }
}

export function determineStateTransition(zone: EchoZone): NPCState {
  return ECHO_ZONE_STATE_MAP[zone.type] ?? "wandering";
}

function filterRelevantGoals(goals: NPCLongTermGoal[], zoneType: EchoZoneType): NPCLongTermGoal[] {
  const allowedTypes = ECHO_ZONE_GOAL_TYPES[zoneType];
  if (!allowedTypes) {
    return filterGoalsByType(goals, ["combat", "survive", "defend", "trade"]);
  }
  return filterGoalsByType(goals, allowedTypes);
}

export class HeuristicGoalPruner {
  public static readonly SCAN_RADIUS_SQ = SCAN_RADIUS_SQ;
  public static readonly COMBAT_THRESHOLD = COMBAT_INTENSITY_THRESHOLD;
  public static readonly COLLECT_THRESHOLD = COLLECT_INTENSITY_THRESHOLD;

  public prune<TGoal extends GoalLike>(
    goals: readonly TGoal[] | null | undefined,
    context: DeterministicGoalPruneContext,
  ): DeterministicGoalPruneResult<TGoal> {
    return HeuristicGoalPruner.pruneGoals(goals, context);
  }

  public static pruneGoals<TGoal extends GoalLike>(
    goals: readonly TGoal[] | null | undefined,
    context: DeterministicGoalPruneContext,
  ): DeterministicGoalPruneResult<TGoal> {
    const source = Array.isArray(goals) ? goals : [];
    const maxGoals = Math.max(0, Math.trunc(finite(context.maxGoals, source.length)));
    const minScore = finite(context.minScore, Number.NEGATIVE_INFINITY);
    const tick = Math.max(0, Math.trunc(finite(context.tick)));
    const npcEnergy = clamp100(context.npcEnergy ?? 100);
    const dangerLevel = clamp100(context.dangerLevel ?? 0);
    const echoIntensity = finite(context.echoIntensity ?? 0);
    const invalidTargets = context.knownInvalidTargets ?? new Set<string>();

    const keptCandidates: Array<{ goal: TGoal; score: number; index: number }> = [];
    const removed: DeterministicGoalPruneResult<TGoal>["removed"] = [];

    source.forEach((goal, index) => {
      const score = HeuristicGoalPruner.scoreGoal(goal, { tick, npcEnergy, dangerLevel });

      if (goal.expiresAtTick !== undefined && finite(goal.expiresAtTick) <= tick) {
        removed.push({ goal, reason: "expired", score });
        return;
      }

      if (goal.targetId !== undefined && invalidTargets.has(String(goal.targetId))) {
        removed.push({ goal, reason: "invalid_target", score });
        return;
      }

      if (clamp100(goal.cost) > npcEnergy + 20) {
        removed.push({ goal, reason: "too_expensive", score });
        return;
      }

      if (echoIntensity >= 0.70 && goal.isCritical !== true && clamp100(goal.priority) < 80) {
        removed.push({ goal, reason: "echo_non_critical", score });
        return;
      }

      if (score < minScore) {
        removed.push({ goal, reason: "low_score", score });
        return;
      }

      keptCandidates.push({ goal, score, index });
    });

    keptCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const idA = stableGoalId(a.goal, a.index);
      const idB = stableGoalId(b.goal, b.index);
      return idA < idB ? -1 : idA > idB ? 1 : a.index - b.index;
    });

    const kept = keptCandidates.slice(0, maxGoals).map((entry) => entry.goal);
    for (const entry of keptCandidates.slice(maxGoals)) {
      removed.push({ goal: entry.goal, reason: "overflow", score: entry.score });
    }

    return { kept, removed };
  }

  public static scoreGoal(goal: GoalLike, context: { tick: number; npcEnergy: number; dangerLevel: number }): number {
    const priority = clamp100(goal.priority);
    const urgency = clamp100(goal.urgency ?? priority);
    const cost = clamp100(goal.cost);
    const risk = clamp100(goal.risk);
    const age = Math.max(0, Math.trunc(finite(context.tick) - finite(goal.createdTick)));
    const goalType = String(goal.type ?? goal.kind ?? "");

    const survivalBias = goalType === "survive" || goalType === "defend" || goalType === "combat"
      ? clamp100(context.dangerLevel) * 2
      : 0;
    const lowEnergyPenalty = context.npcEnergy < 30 && cost > 40 ? 50 : 0;
    const stalePenalty = Math.floor(age / 100);

    return priority * 3 + urgency * 2 - cost - risk + survivalBias - lowEnergyPenalty - stalePenalty;
  }

  public static pruneByEchoIntensity(
    npc: { x: number; y: number; state: NPCState; stateTimer?: number; memory: NPCMemoryCache },
    activeZones: EchoZone[],
  ): PruningResult {
    let closestZone: EchoZone | null = null;
    let closestDistSq = Infinity;

    for (const zone of activeZones) {
      const dx = finite(npc.x) - finite(zone.x);
      const dy = finite(npc.y) - finite(zone.y);
      const distSq = dx * dx + dy * dy;
      const radius = Math.max(0, finite(zone.radius));

      if (distSq < radius * radius && isHighIntensityZone(zone) && distSq < closestDistSq) {
        closestDistSq = distSq;
        closestZone = zone;
      }
    }

    if (!closestZone) {
      return { pruned: false, goalsRemoved: 0, newState: npc.state, reason: "no_high_intensity_zone" };
    }

    const originalCount = npc.memory.longTermGoals.length;
    npc.memory.longTermGoals = filterRelevantGoals(npc.memory.longTermGoals, closestZone.type);
    const goalsRemoved = originalCount - npc.memory.longTermGoals.length;

    const newState = determineStateTransition(closestZone);
    npc.state = newState;
    npc.stateTimer = TICK_RATE_MS * 10;
    npc.memory.lastPruneTime = 0;

    return {
      pruned: goalsRemoved > 0,
      goalsRemoved,
      newState,
      reason: `entered_${closestZone.type}_zone_intensity_${closestZone.intensity}`,
    };
  }

  public static isWithinRadius(x1: number, y1: number, x2: number, y2: number, radius: number): boolean {
    const dx = finite(x1) - finite(x2);
    const dy = finite(y1) - finite(y2);
    const r = Math.max(0, finite(radius));
    return dx * dx + dy * dy < r * r;
  }

  public static pruneAll(
    npcs: Array<{ x: number; y: number; state: NPCState; stateTimer?: number; memory: NPCMemoryCache }>,
    activeZones: EchoZone[],
  ): PruningResult[] {
    return npcs.map((npc) => HeuristicGoalPruner.pruneByEchoIntensity(npc, activeZones));
  }

  public static resetToWandering(npc: { state: NPCState; stateTimer?: number; memory: NPCMemoryCache }): void {
    npc.state = "wandering";
    npc.stateTimer = 0;
    npc.memory.shortTermGoals = [];
  }

  public static getTopGoal(npc: { memory: NPCMemoryCache }): NPCLongTermGoal | undefined {
    return getTopGoal(npc.memory.longTermGoals);
  }
}

export default HeuristicGoalPruner;
