/**
 * Activity Resolver - Deterministic NPC Activity State Resolution
 * 
 * Resolves NPC/Monster activity from brain state, memory, and world context.
 * All decisions are deterministic: same tick + same input = same output.
 * 
 * Activity resolution path:
 * 1. Check danger/health conditions (highest priority)
 * 2. Check work role activity
 * 3. Check guarding behavior
 * 4. Determine wandering/movement intent
 * 5. Generate bounded memory events
 */

import { stableHash32, createARESeed } from "../../core/determinism/AREDeterminism.js";
import type {
  ActivityResolutionContext,
  ResolvedActivity,
  NPCActivityState,
  ActivityMemoryEvent,
  NPCActivityEvent,
  NPCWorkRole,
  MonsterArchetype,
} from "./NPCActivitySnapshot.js";
import {
  getChunkKey,
  generateActivityHash,
  generateMemoryEventId,
  DEFAULT_MEMORY_BOUNDS,
} from "./NPCActivitySnapshot.js";
import { selectStableTarget, type TargetCandidate } from "./StableTargetSelection.js";

// ============================================================================
// Resolution Thresholds (Deterministic)
// ============================================================================

const THRESHOLDS = {
  // Health thresholds
  CRITICAL_HEALTH: 0.2,
  LOW_HEALTH: 0.3,
  
  // Energy thresholds
  LOW_ENERGY: 0.2,
  
  // Danger thresholds
  DANGER_THRESHOLD: 0.5,
  HIGH_DANGER: 0.7,
  
  // Distance thresholds for movement
  WANDER_RADIUS: 50,
  GUARD_RADIUS: 30,
  
  // Threat level for flee decision
  FLEE_THREAT_LEVEL: 0.6,
};

// ============================================================================
// Main Activity Resolution
// ============================================================================

/**
 * Resolve activity for a single NPC/Monster
 * Deterministic: same input always produces same output
 */
export function resolveActivity(ctx: ActivityResolutionContext): ResolvedActivity {
  // Priority 1: Critical health → idle/rest
  if (ctx.health < THRESHOLDS.CRITICAL_HEALTH) {
    return createActivity("idle", ctx, "low_health", "activity.health_critical");
  }
  
  // Priority 2: Detect and respond to danger
  const dangerLevel = calculateDangerLevel(ctx.nearbyThreats);
  if (dangerLevel > THRESHOLDS.FLEE_THREAT_LEVEL) {
    return resolveFleeActivity(ctx);
  }
  
  // Priority 3: Work role activity
  if (ctx.workRole) {
    const workActivity = resolveWorkActivity(ctx);
    if (workActivity) return workActivity;
  }
  
  // Priority 4: Guard behavior (guards, soldiers, protectors)
  if (isGuardRole(ctx.brainState) || isMonsterArchetypeDefensive(ctx.monsterArchetype)) {
    const guardActivity = resolveGuardActivity(ctx);
    if (guardActivity) return guardActivity;
  }
  
  // Priority 5: Attack behavior (monsters, hostile NPCs)
  if (ctx.monsterArchetype || isHostileState(ctx.brainState)) {
    const attackActivity = resolveAttackActivity(ctx);
    if (attackActivity) return attackActivity;
  }
  
  // Priority 6: Wandering / idle based on energy
  if (ctx.energy < THRESHOLDS.LOW_ENERGY) {
    return createActivity("idle", ctx, "energy_recovered", undefined, {
      facing: calculateFacingDirection(ctx.position, { x: 0, y: 0 }),
    });
  }
  
  // Default: deterministic wandering
  return resolveWanderingActivity(ctx);
}

// ============================================================================
// Activity Resolution Sub-functions
// ============================================================================

/**
 * Resolve flee activity deterministically
 */
function resolveFleeActivity(ctx: ActivityResolutionContext): ResolvedActivity {
  // Find safe direction using stable target selection (away from threats)
  const fleeDirection = calculateFleeDirection(ctx.position, ctx.nearbyThreats);
  
  const memoryEvent: ActivityMemoryEvent = {
    id: generateMemoryEventId(ctx.entityId, ctx.tick, "flee_initiated"),
    entityId: ctx.entityId,
    tick: ctx.tick,
    eventType: "flee_initiated",
    data: {
      threatCount: ctx.nearbyThreats.length,
      dangerLevel: calculateDangerLevel(ctx.nearbyThreats),
    },
  };
  
  return createActivity("fleeing", ctx, "danger_detected", "activity.fleeing", {
    facing: calculateFacingDirection(ctx.position, fleeDirection),
    movementIntent: fleeDirection,
  }, memoryEvent);
}

/**
 * Resolve work activity based on role
 */
function resolveWorkActivity(ctx: ActivityResolutionContext): ResolvedActivity | null {
  const workActivities: Record<NPCWorkRole, NPCActivityState> = {
    blacksmith: "working",
    farmer: "working",
    merchant: "working",
    guard: "guarding",
    healer: "working",
    scholar: "working",
    tavern_keeper: "working",
    fisherman: "working",
    woodcutter: "working",
    miner: "working",
    craftsman: "working",
    noble: "idle",
    citizen: "wandering",
  };
  
  const activity = workActivities[ctx.workRole] ?? "idle";
  const statusKey = `activity.working.${ctx.workRole}`;
  
  // Work has deterministic position intent
  const workPositionIntent = getWorkPositionIntent(ctx.position, ctx.workRole);
  
  const memoryEvent: ActivityMemoryEvent = {
    id: generateMemoryEventId(ctx.entityId, ctx.tick, "work_started"),
    entityId: ctx.entityId,
    tick: ctx.tick,
    eventType: "work_started",
    data: { role: ctx.workRole },
  };
  
  return createActivity(activity, ctx, "work_started", statusKey, {
    facing: calculateFacingDirection(ctx.position, workPositionIntent),
    movementIntent: workPositionIntent,
  }, memoryEvent);
}

/**
 * Resolve guard activity
 */
function resolveGuardActivity(ctx: ActivityResolutionContext): ResolvedActivity | null {
  // Guards prioritize nearby threats deterministically
  if (ctx.nearbyThreats.length > 0) {
    const primaryThreat = selectStableTarget(
      ctx.nearbyThreats.map(t => ({
        id: t.id,
        position: t.position,
        type: "monster" as const,
        distance: calculateDistance(ctx.position, t.position),
        idHash: stableHash32(t.id),
      })),
      ctx.position
    );
    
    const memoryEvent: ActivityMemoryEvent = {
      id: generateMemoryEventId(ctx.entityId, ctx.tick, "danger_detected"),
      entityId: ctx.entityId,
      tick: ctx.tick,
      eventType: "danger_detected",
      fromActivity: "guarding",
      toActivity: "enter_attacking",
      targetId: primaryThreat.id ?? undefined,
      data: {
        threatCount: ctx.nearbyThreats.length,
      },
    };
    
    return createActivity("attacking", ctx, "danger_detected", "activity.guarding.alert", {
      facing: calculateFacingDirection(ctx.position, primaryThreat.position ?? { x: 0, y: 0 }),
      movementIntent: undefined,
    }, memoryEvent);
  }
  
  // No threats - patrol/wander deterministically
  const patrolIntent = getPatrolDirection(ctx.entityId, ctx.position, ctx.tick);
  
  return createActivity("guarding", ctx, "no_danger", "activity.guarding.patrol", {
    facing: calculateFacingDirection(ctx.position, patrolIntent),
    movementIntent: patrolIntent,
  });
}

/**
 * Resolve attack activity for monsters
 */
function resolveAttackActivity(ctx: ActivityResolutionContext): ResolvedActivity | null {
  // Only attack if there are valid targets and sufficient health
  if (ctx.health < THRESHOLDS.LOW_HEALTH) {
    return resolveFleeActivity(ctx);
  }
  
  if (ctx.nearbyTargets.length === 0) {
    return resolveWanderingActivity(ctx);
  }
  
  // Select stable target
  const targetCandidates: TargetCandidate[] = ctx.nearbyTargets.map(t => ({
    id: t.id,
    position: t.position,
    type: t.type,
    distance: calculateDistance(ctx.position, t.position),
    idHash: stableHash32(t.id),
  }));
  
  const target = selectStableTarget(targetCandidates, ctx.position);
  
  const memoryEvent: ActivityMemoryEvent = {
    id: generateMemoryEventId(ctx.entityId, ctx.tick, "target_acquired"),
    entityId: ctx.entityId,
    tick: ctx.tick,
    eventType: "target_acquired",
    targetId: target.id ?? undefined,
    data: {
      targetType: targetCandidates.find(t => t.id === target.id)?.type,
      distance: target.distance,
    },
  };
  
  return createActivity("attacking", ctx, "target_acquired", "activity.attacking", {
    facing: calculateFacingDirection(ctx.position, target.position ?? { x: 0, y: 0 }),
    movementIntent: undefined,
  }, memoryEvent);
}

/**
 * Resolve wandering activity deterministically
 */
function resolveWanderingActivity(ctx: ActivityResolutionContext): ResolvedActivity {
  // Deterministic wandering within bounds
  const wanderIntent = getWanderDirection(ctx.entityId, ctx.position, ctx.tick);
  
  return createActivity("wandering", ctx, undefined, "activity.wandering", {
    facing: calculateFacingDirection(ctx.position, wanderIntent),
    movementIntent: wanderIntent,
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create resolved activity with all metadata
 */
function createActivity(
  activity: NPCActivityState,
  ctx: ActivityResolutionContext,
  eventType?: NPCActivityEvent,
  statusTextKey?: string,
  intent?: {
    facing?: number;
    movementIntent?: { x: number; y: number };
  },
  memoryEvent?: ActivityMemoryEvent
): ResolvedActivity {
  return {
    activity,
    intentTargetId: memoryEvent?.targetId,
    facing: intent?.facing,
    movementIntent: intent?.movementIntent,
    statusTextKey,
    memoryEvent,
  };
}

/**
 * Calculate overall danger level from threats
 */
function calculateDangerLevel(
  threats: Array<{ id: string; threatLevel: number }>
): number {
  if (threats.length === 0) return 0;
  
  // Use max threat for danger calculation
  let maxThreat = 0;
  for (const threat of threats) {
    if (threat.threatLevel > maxThreat) {
      maxThreat = threat.threatLevel;
    }
  }
  
  // Scale by number of threats
  const threatCountFactor = Math.min(1, threats.length / 5);
  return Math.min(1, maxThreat * (0.5 + 0.5 * threatCountFactor));
}

/**
 * Calculate flee direction away from threats
 */
function calculateFleeDirection(
  position: { x: number; y: number },
  threats: Array<{ position: { x: number; y: number }; threatLevel: number }>
): { x: number; y: number } {
  if (threats.length === 0) {
    return { x: 0, y: -1 }; // Default flee north
  }
  
  // Calculate weighted average threat position
  let weightedX = 0;
  let weightedY = 0;
  let totalWeight = 0;
  
  for (const threat of threats) {
    const dx = threat.position.x - position.x;
    const dy = threat.position.y - position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > 0) {
      const weight = threat.threatLevel / distSq;
      weightedX += threat.position.x * weight;
      weightedY += threat.position.y * weight;
      totalWeight += weight;
    }
  }
  
  if (totalWeight > 0) {
    // Flee opposite direction from weighted threat center
    const avgThreatX = weightedX / totalWeight;
    const avgThreatY = weightedY / totalWeight;
    const fleeX = position.x - avgThreatX;
    const fleeY = position.y - avgThreatY;
    
    // Normalize
    const mag = Math.sqrt(fleeX * fleeX + fleeY * fleeY);
    if (mag > 0) {
      return {
        x: Math.round(fleeX / mag * THRESHOLDS.WANDER_RADIUS),
        y: Math.round(fleeY / mag * THRESHOLDS.WANDER_RADIUS),
      };
    }
  }
  
  return { x: 0, y: -THRESHOLDS.WANDER_RADIUS };
}

/**
 * Get deterministic wander direction based on entity ID and tick
 */
function getWanderDirection(
  entityId: string,
  position: { x: number; y: number },
  tick: number
): { x: number; y: number } {
  // Deterministic wandering using stable hash
  const seed = createARESeed([entityId, tick]);
  const hash = stableHash32(seed);
  
  // Use hash to generate direction (0-7 for 8 directions)
  const directionIndex = hash % 8;
  const directions = [
    { x: 0, y: -1 },   // N
    { x: 1, y: -1 },   // NE
    { x: 1, y: 0 },    // E
    { x: 1, y: 1 },    // SE
    { x: 0, y: 1 },    // S
    { x: -1, y: 1 },   // SW
    { x: -1, y: 0 },   // W
    { x: -1, y: -1 },  // NW
  ];
  
  const direction = directions[directionIndex]!;
  
  // Scale by deterministic step size based on tick
  const stepSize = 5 + (hash % 10);
  
  return {
    x: direction.x * stepSize,
    y: direction.y * stepSize,
  };
}

/**
 * Get deterministic patrol direction for guards
 */
function getPatrolDirection(
  entityId: string,
  position: { x: number; y: number },
  tick: number
): { x: number; y: number } {
  // Patrol follows a deterministic pattern
  const patrolSeed = createARESeed([entityId, Math.floor(tick / 100)]);
  const hash = stableHash32(patrolSeed);
  
  // Rotate patrol direction based on tick
  const directionIndex = hash % 4;
  const directions = [
    { x: THRESHOLDS.GUARD_RADIUS, y: 0 },   // E
    { x: 0, y: THRESHOLDS.GUARD_RADIUS },   // S
    { x: -THRESHOLDS.GUARD_RADIUS, y: 0 },  // W
    { x: 0, y: -THRESHOLDS.GUARD_RADIUS },  // N
  ];
  
  return directions[directionIndex]!;
}

/**
 * Get work position intent for working NPCs
 */
function getWorkPositionIntent(
  position: { x: number; y: number },
  role: NPCWorkRole
): { x: number; y: number } {
  // Each work role has a deterministic work position
  const workPositions: Record<NPCWorkRole, { x: number; y: number }> = {
    blacksmith: { x: 10, y: 0 },    // Near anvil
    farmer: { x: 0, y: 10 },        // Field work
    merchant: { x: 0, y: 0 },       // Counter position
    guard: { x: 0, y: 0 },          // Post position
    healer: { x: 5, y: 5 },         // Near healing station
    scholar: { x: 0, y: 0 },        // Library/study
    tavern_keeper: { x: 0, y: 0 },  // Behind bar
    fisherman: { x: 0, y: 20 },     // Near water
    woodcutter: { x: -10, y: 0 },   // Forest edge
    miner: { x: 0, y: -10 },        // Mine entrance
    craftsman: { x: 5, y: 0 },      // Workshop
    noble: { x: 0, y: 0 },          // Manor
    citizen: { x: 0, y: 0 },        // Default
  };
  
  return workPositions[role] ?? { x: 0, y: 0 };
}

/**
 * Calculate facing direction from position to target
 */
function calculateFacingDirection(
  from: { x: number; y: number },
  to: { x: number; y: number }
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  if (dx === 0 && dy === 0) return 0;
  
  // Calculate angle in degrees
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  
  return Math.round(angle);
}

/**
 * Check if brain state indicates guard role
 */
function isGuardRole(brainState: string): boolean {
  const guardStates = ["guard", "patrol", "defend", "watch"];
  const state = brainState.toLowerCase();
  return guardStates.some(s => state.includes(s));
}

/**
 * Check if monster archetype is defensive
 */
function isMonsterArchetypeDefensive(archetype?: MonsterArchetype): boolean {
  return archetype === "golem" || archetype === "elemental";
}

/**
 * Check if brain state indicates hostile behavior
 */
function isHostileState(brainState: string): boolean {
  const hostileStates = ["combat", "attack", "hunt", "aggressive"];
  const state = brainState.toLowerCase();
  return hostileStates.some(s => state.includes(s));
}

export { calculateDistance };