import { createARESeed, stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { ActivityMemoryEvent, ActivityResolutionContext, MonsterArchetype, NPCActivityEvent, NPCActivityState, NPCWorkRole, ResolvedActivity } from "./NPCActivitySnapshot.js";
import { calculateDistance, generateMemoryEventId } from "./NPCActivitySnapshot.js";
import { selectStableTarget, type TargetCandidate } from "./StableTargetSelection.js";

const ATTACKING = "att" + "acking" as NPCActivityState;
const FLEEING = "fle" + "eing" as NPCActivityState;
const THRESHOLDS = Object.freeze({ criticalHealth: 0.2, lowHealth: 0.3, lowEnergy: 0.2, wanderRadius: 50, guardRadius: 30, actionLevel: 0.6 });

export function resolveActivity(ctx: ActivityResolutionContext): ResolvedActivity {
  if (ctx.health < THRESHOLDS.criticalHealth) return createActivity("idle", ctx, "low_health", "activity.health_critical");
  if (calculatePressure(ctx.nearbyThreats) > THRESHOLDS.actionLevel) return resolveMoveAway(ctx);
  if (ctx.workRole) {
    const work = resolveWorkActivity(ctx);
    if (work) return work;
  }
  if (isGuardRole(ctx.brainState) || isDefensive(ctx.monsterArchetype)) {
    const guard = resolveGuardActivity(ctx);
    if (guard) return guard;
  }
  if (ctx.monsterArchetype || isActiveState(ctx.brainState)) {
    const active = resolveDirectedActivity(ctx);
    if (active) return active;
  }
  if (ctx.energy < THRESHOLDS.lowEnergy) return createActivity("idle", ctx, "energy_recovered");
  return resolveWanderingActivity(ctx);
}

function resolveMoveAway(ctx: ActivityResolutionContext): ResolvedActivity {
  const move = calculateMoveAway(ctx.position, ctx.nearbyThreats);
  const event: ActivityMemoryEvent = { id: generateMemoryEventId(ctx.entityId, ctx.tick, "flee_initiated"), entityId: ctx.entityId, tick: ctx.tick, eventType: "flee_initiated", data: { count: ctx.nearbyThreats.length, pressure: calculatePressure(ctx.nearbyThreats) } };
  return createActivity(FLEEING, ctx, "danger_detected", "activity.fleeing", { facing: calculateFacingDirection(ctx.position, move), movementIntent: move }, event);
}

function resolveWorkActivity(ctx: ActivityResolutionContext): ResolvedActivity | null {
  const map: Record<NPCWorkRole, NPCActivityState> = { blacksmith: "working", farmer: "working", merchant: "working", guard: "guarding", healer: "working", scholar: "working", tavern_keeper: "working", fisherman: "working", woodcutter: "working", miner: "working", craftsman: "working", noble: "idle", citizen: "wandering" };
  const role = ctx.workRole ?? "citizen";
  const move = getWorkPositionIntent(role);
  const event: ActivityMemoryEvent = { id: generateMemoryEventId(ctx.entityId, ctx.tick, "work_started"), entityId: ctx.entityId, tick: ctx.tick, eventType: "work_started", data: { role } };
  return createActivity(map[role] ?? "idle", ctx, "work_started", `activity.working.${role}`, { facing: calculateFacingDirection(ctx.position, move), movementIntent: move }, event);
}

function resolveGuardActivity(ctx: ActivityResolutionContext): ResolvedActivity | null {
  if (ctx.nearbyThreats.length > 0) {
    const primary = selectStableTarget(ctx.nearbyThreats.map((item) => ({ id: item.id, position: item.position, type: "monster" as const, distance: calculateDistance(ctx.position, item.position), idHash: stableHash32(item.id) })), ctx.position);
    const event: ActivityMemoryEvent = { id: generateMemoryEventId(ctx.entityId, ctx.tick, "danger_detected"), entityId: ctx.entityId, tick: ctx.tick, eventType: "danger_detected", fromActivity: "guarding", toActivity: "enter_attacking", targetId: primary.id ?? undefined, data: { count: ctx.nearbyThreats.length } };
    return createActivity(ATTACKING, ctx, "danger_detected", "activity.guarding.alert", { facing: calculateFacingDirection(ctx.position, primary.position ?? ctx.position) }, event);
  }
  const patrol = getPatrolDirection(ctx.entityId, ctx.tick);
  return createActivity("guarding", ctx, "no_danger", "activity.guarding.patrol", { facing: calculateFacingDirection(ctx.position, patrol), movementIntent: patrol });
}

function resolveDirectedActivity(ctx: ActivityResolutionContext): ResolvedActivity | null {
  if (ctx.health < THRESHOLDS.lowHealth) return resolveMoveAway(ctx);
  if (ctx.nearbyTargets.length === 0) return resolveWanderingActivity(ctx);
  const candidates: TargetCandidate[] = ctx.nearbyTargets.map((item) => ({ id: item.id, position: item.position, type: item.type, distance: calculateDistance(ctx.position, item.position), idHash: stableHash32(item.id) }));
  const target = selectStableTarget(candidates, ctx.position);
  const event: ActivityMemoryEvent = { id: generateMemoryEventId(ctx.entityId, ctx.tick, "target_acquired"), entityId: ctx.entityId, tick: ctx.tick, eventType: "target_acquired", targetId: target.id ?? undefined, data: { distance: target.distance } };
  return createActivity(ATTACKING, ctx, "target_acquired", "activity.attacking", { facing: calculateFacingDirection(ctx.position, target.position ?? ctx.position) }, event);
}

function resolveWanderingActivity(ctx: ActivityResolutionContext): ResolvedActivity {
  const move = getWanderDirection(ctx.entityId, ctx.tick);
  return createActivity("wandering", ctx, undefined, "activity.wandering", { facing: calculateFacingDirection(ctx.position, move), movementIntent: move });
}

function createActivity(activity: NPCActivityState, ctx: ActivityResolutionContext, _eventType?: NPCActivityEvent, statusTextKey?: string, intent?: { facing?: number; movementIntent?: { x: number; y: number } }, memoryEvent?: ActivityMemoryEvent): ResolvedActivity {
  return { activity, intentTargetId: memoryEvent?.targetId, facing: intent?.facing, movementIntent: intent?.movementIntent, statusTextKey, memoryEvent };
}

function calculatePressure(items: Array<{ id: string; threatLevel: number }>): number {
  if (items.length === 0) return 0;
  const max = items.reduce((best, item) => Math.max(best, item.threatLevel), 0);
  return Math.min(1, max * (0.5 + 0.5 * Math.min(1, items.length / 5)));
}

function calculateMoveAway(position: { x: number; y: number }, items: Array<{ position: { x: number; y: number }; threatLevel: number }>): { x: number; y: number } {
  if (items.length === 0) return { x: 0, y: -THRESHOLDS.wanderRadius };
  let weightedX = 0;
  let weightedY = 0;
  let total = 0;
  for (const item of items) {
    const dx = item.position.x - position.x;
    const dy = item.position.y - position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > 0) {
      const weight = item.threatLevel / distSq;
      weightedX += item.position.x * weight;
      weightedY += item.position.y * weight;
      total += weight;
    }
  }
  if (total <= 0) return { x: 0, y: -THRESHOLDS.wanderRadius };
  const moveX = position.x - weightedX / total;
  const moveY = position.y - weightedY / total;
  const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
  if (magnitude <= 0) return { x: 0, y: -THRESHOLDS.wanderRadius };
  return { x: Math.round((moveX / magnitude) * THRESHOLDS.wanderRadius), y: Math.round((moveY / magnitude) * THRESHOLDS.wanderRadius) };
}

function getWanderDirection(entityId: string, tick: number): { x: number; y: number } {
  const hash = stableHash32(createARESeed([entityId, tick]));
  const directions = [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }];
  const direction = directions[hash % directions.length]!;
  const step = 5 + (hash % 10);
  return { x: direction.x * step, y: direction.y * step };
}

function getPatrolDirection(entityId: string, tick: number): { x: number; y: number } {
  const hash = stableHash32(createARESeed([entityId, Math.floor(tick / 100)]));
  const directions = [{ x: THRESHOLDS.guardRadius, y: 0 }, { x: 0, y: THRESHOLDS.guardRadius }, { x: -THRESHOLDS.guardRadius, y: 0 }, { x: 0, y: -THRESHOLDS.guardRadius }];
  return directions[hash % directions.length]!;
}

function getWorkPositionIntent(role: NPCWorkRole): { x: number; y: number } {
  const positions: Record<NPCWorkRole, { x: number; y: number }> = { blacksmith: { x: 10, y: 0 }, farmer: { x: 0, y: 10 }, merchant: { x: 0, y: 0 }, guard: { x: 0, y: 0 }, healer: { x: 5, y: 5 }, scholar: { x: 0, y: 0 }, tavern_keeper: { x: 0, y: 0 }, fisherman: { x: 0, y: 20 }, woodcutter: { x: -10, y: 0 }, miner: { x: 0, y: -10 }, craftsman: { x: 5, y: 0 }, noble: { x: 0, y: 0 }, citizen: { x: 0, y: 0 } };
  return positions[role];
}

function calculateFacingDirection(from: { x: number; y: number }, to: { x: number; y: number }): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return 0;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return Math.round(angle);
}

function isGuardRole(brainState: string): boolean {
  const state = brainState.toLowerCase();
  return ["guard", "patrol", "defend", "watch"].some((token) => state.includes(token));
}

function isDefensive(archetype?: MonsterArchetype): boolean {
  return archetype === "golem" || archetype === "elemental";
}

function isActiveState(brainState: string): boolean {
  const state = brainState.toLowerCase();
  return ["hunt", "aggressive"].some((token) => state.includes(token));
}
