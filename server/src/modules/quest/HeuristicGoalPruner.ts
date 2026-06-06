/**
 * HeuristicGoalPruner - NPC AI Focus Optimizer
 * 
 * Focuses NPC AI in 10-Hz loop using deterministic heuristics.
 * Uses Squared-Distance (dx*dx + dy*dy < 1600) to avoid sqrt.
 * Deletes irrelevant longTermGoals when entering high-intensity Echo Zones.
 * Forces deterministic state transition to 'wandering' for CPU savings.
 */

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

// Re-export types for consumers
export type { NPCState as NpcStateType, NPCGoalType as GoalType } from "../../types/npc.types.js";

export enum EchoZoneType {
  COMBAT = 'COMBAT',
  COLLECT = 'COLLECT',
  QUEST = 'QUEST',
  TRADE = 'TRADE',
  SOCIAL = 'SOCIAL'
}

/**
 * Legacy-compatible NPCMemoryCache using new types
 */
export interface NPCMemoryCache {
  longTermGoals: NPCLongTermGoal[];
  shortTermGoals: NPCLongTermGoal[];
  lastPruneTime: number;
  // v2 fields
  events?: NPCMemoryEvent[];
  relations?: NPCRelation[];
}

/**
 * Legacy Goal interface for backward compatibility
 */
export interface Goal {
  id: string;
  type: string;
  priority: number;
  x?: number;
  y?: number;
}

/**
 * Echo Zone for NPC focus areas
 */
export interface EchoZone {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  type: EchoZoneType;
}

/**
 * Result of pruning operation
 */
export interface PruningResult {
  pruned: boolean;
  goalsRemoved: number;
  newState: NPCState;
  reason: string;
}

const SCAN_RADIUS_SQ = 1600;
const COMBAT_INTENSITY_THRESHOLD = 0.95;
const COLLECT_INTENSITY_THRESHOLD = 0.80;
const TICK_RATE_MS = 100;

/**
 * Map EchoZoneType to allowed goal types for filtering
 */
const ECHO_ZONE_GOAL_TYPES: Record<EchoZoneType, NPCGoalType[]> = {
  [EchoZoneType.COMBAT]: ['combat', 'survive', 'defend'],
  [EchoZoneType.COLLECT]: ['collect', 'gather'],
  [EchoZoneType.QUEST]: ['quest_main', 'quest_side'],
  [EchoZoneType.TRADE]: ['trade'],
  [EchoZoneType.SOCIAL]: ['social'],
};

/**
 * Map EchoZoneType to NPCState
 */
const ECHO_ZONE_STATE_MAP: Record<EchoZoneType, NPCState> = {
  [EchoZoneType.COMBAT]: 'combat',
  [EchoZoneType.COLLECT]: 'collecting',
  [EchoZoneType.QUEST]: 'questing',
  [EchoZoneType.TRADE]: 'trading',
  [EchoZoneType.SOCIAL]: 'social',
};

export function isInEchoZone(npcX: number, npcY: number, zone: EchoZone): boolean {
  const dx = npcX - zone.x;
  const dy = npcY - zone.y;
  const distSq = dx * dx + dy * dy;
  const radiusSq = zone.radius * zone.radius;
  return distSq < radiusSq;
}

export function isHighIntensityZone(zone: EchoZone): boolean {
  switch (zone.type) {
    case EchoZoneType.COMBAT:
      return zone.intensity >= COMBAT_INTENSITY_THRESHOLD;
    case EchoZoneType.COLLECT:
      return zone.intensity >= COLLECT_INTENSITY_THRESHOLD;
    default:
      return zone.intensity >= 0.70;
  }
}

export function determineStateTransition(zone: EchoZone): NPCState {
  return ECHO_ZONE_STATE_MAP[zone.type] ?? 'wandering';
}

function filterRelevantGoals(goals: NPCLongTermGoal[], zoneType: EchoZoneType): NPCLongTermGoal[] {
  const allowedTypes = ECHO_ZONE_GOAL_TYPES[zoneType];
  if (!allowedTypes) {
    // Fallback: keep high priority goals
    return filterGoalsByType(goals, ['combat', 'survive', 'defend', 'trade']);
  }
  return filterGoalsByType(goals, allowedTypes);
}

export class HeuristicGoalPruner {
  private static readonly SCAN_RADIUS_SQ = SCAN_RADIUS_SQ;
  private static readonly COMBAT_THRESHOLD = COMBAT_INTENSITY_THRESHOLD;
  private static readonly COLLECT_THRESHOLD = COLLECT_INTENSITY_THRESHOLD;

  public static pruneByEchoIntensity(
    npc: { x: number; y: number; state: NPCState; stateTimer?: number; memory: NPCMemoryCache },
    activeZones: EchoZone[]
  ): PruningResult {
    let closestZone: EchoZone | null = null;
    let closestDistSq = Infinity;
    
    for (const zone of activeZones) {
      const dx = npc.x - zone.x;
      const dy = npc.y - zone.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < (zone.radius * zone.radius) && isHighIntensityZone(zone)) {
        if (distSq < closestDistSq) {
          closestDistSq = distSq;
          closestZone = zone;
        }
      }
    }
    
    if (!closestZone) {
      return { pruned: false, goalsRemoved: 0, newState: npc.state, reason: 'no_high_intensity_zone' };
    }
    
    const originalCount = npc.memory.longTermGoals.length;
    npc.memory.longTermGoals = filterRelevantGoals(npc.memory.longTermGoals, closestZone.type);
    const goalsRemoved = originalCount - npc.memory.longTermGoals.length;
    
    const newState = determineStateTransition(closestZone);
    npc.state = newState;
    npc.stateTimer = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ + TICK_RATE_MS * 10;
    npc.memory.lastPruneTime = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    
    return {
      pruned: goalsRemoved > 0,
      goalsRemoved,
      newState,
      reason: `entered_${closestZone.type}_zone_intensity_${closestZone.intensity}`
    };
  }

  public static isWithinRadius(x1: number, y1: number, x2: number, y2: number, radius: number): boolean {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const distSq = dx * dx + dy * dy;
    const radiusSq = radius * radius;
    return distSq < radiusSq;
  }

  public static pruneAll(
    npcs: Array<{ x: number; y: number; state: NPCState; stateTimer?: number; memory: NPCMemoryCache }>,
    activeZones: EchoZone[]
  ): PruningResult[] {
    return npcs.map(npc => HeuristicGoalPruner.pruneByEchoIntensity(npc, activeZones));
  }

  public static resetToWandering(npc: { state: NPCState; stateTimer?: number; memory: NPCMemoryCache }): void {
    npc.state = 'wandering';
    npc.stateTimer = 0;
    npc.memory.shortTermGoals = [];
  }

  /**
   * Get top goal from NPC memory (using shared helper)
   */
  public static getTopGoal(npc: { memory: NPCMemoryCache }): NPCLongTermGoal | undefined {
    return getTopGoal(npc.memory.longTermGoals);
  }
}

export default HeuristicGoalPruner;
