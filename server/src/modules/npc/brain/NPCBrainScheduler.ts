/**
 * NPCBrainScheduler — Tick-Based Brain Execution Framework
 * 
 * Manages NPC brain execution across different tick intervals:
 * - 10 Hz (every tick): Light movement and danger checks
 * - 1 Hz (every 10 ticks): Decision updates, goal scoring, relation updates
 * - 0.1 Hz (every 100 ticks): Memory compression, routine planning, economy/politics
 * 
 * Uses stable hash distribution to spread CPU load deterministically:
 * - Same NPC always runs brain at same ticks
 * - No random() - fully deterministic for replay
 */

import { stableHash32 } from "../../../core/determinism/AREDeterminism.js";
import type { NPCMemoryV3, NPCBrainOutput, NPCDecision } from "./NPCMemoryV3.js";

// ============================================================================
// Brain Phases
// ============================================================================

export enum BrainPhase {
  /** 10 Hz - Light operations: movement, danger check */
  TICK = 1,
  /** 1 Hz - Moderate operations: decisions, goals, relations */
  DECISION = 10,
  /** 0.1 Hz - Heavy operations: compression, planning, economy */
  PLANNING = 100,
}

// ============================================================================
// Configuration
// ============================================================================

export interface NPCBrainSchedulerConfig {
  /** Ticks between decision phase runs */
  decisionInterval: number;
  /** Ticks between planning phase runs */
  planningInterval: number;
  /** Maximum NPCs to process per planning phase */
  maxPlanningBatch: number;
  /** Enable debug logging */
  debug: boolean;
}

export const DEFAULT_SCHEDULER_CONFIG: NPCBrainSchedulerConfig = {
  decisionInterval: 10, // 1 Hz at 10 ticks/sec
  planningInterval: 100, // 0.1 Hz
  maxPlanningBatch: 50,
  debug: false,
};

// ============================================================================
// NPC Brain State Tracking
// ============================================================================

export interface NPCBrainState {
  npcId: string;
  lastDecisionTick: number;
  lastPlanningTick: number;
  currentAction: string;
  actionStartTick: number;
  consecutiveIdleTicks: number;
  phaseModulo: number; // Deterministic offset for load distribution
}

const brainStates = new Map<string, NPCBrainState>();

// ============================================================================
// Phase Calculation
// ============================================================================

/**
 * Get NPC's deterministic phase offset (0 to interval-1)
 * This ensures NPCs are distributed across the tick cycle
 */
export function getNPCBrainPhase(npcId: string, interval: number): number {
  const hash = stableHash32(npcId);
  return hash % interval;
}

/**
 * Check if NPC should run brain at current tick
 * Uses stable hash for deterministic scheduling
 */
export function shouldRunBrainPhase(
  npcId: string,
  currentTick: number,
  interval: number
): boolean {
  const phase = getNPCBrainPhase(npcId, interval);
  return currentTick % interval === phase;
}

/**
 * Get all phases that should run at current tick
 */
export function getActivePhases(
  npcId: string,
  currentTick: number,
  config: NPCBrainSchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): BrainPhase[] {
  const phases: BrainPhase[] = [];

  // Always run tick phase (light operations)
  phases.push(BrainPhase.TICK);

  // Check decision phase
  if (shouldRunBrainPhase(npcId, currentTick, config.decisionInterval)) {
    phases.push(BrainPhase.DECISION);
  }

  // Check planning phase
  if (shouldRunBrainPhase(npcId, currentTick, config.planningInterval)) {
    phases.push(BrainPhase.PLANNING);
  }

  return phases;
}

// ============================================================================
// Brain State Management
// ============================================================================

/**
 * Get or create brain state for NPC
 */
export function getBrainState(npcId: string): NPCBrainState {
  let state = brainStates.get(npcId);
  if (!state) {
    state = {
      npcId,
      lastDecisionTick: 0,
      lastPlanningTick: 0,
      currentAction: "idle",
      actionStartTick: 0,
      consecutiveIdleTicks: 0,
      phaseModulo: getNPCBrainPhase(npcId, 1000),
    };
    brainStates.set(npcId, state);
  }
  return state;
}

/**
 * Update brain state after decision
 */
export function updateBrainState(
  npcId: string,
  decision: NPCDecision,
  currentTick: number
): void {
  const state = getBrainState(npcId);
  
  if (decision.action === "idle") {
    state.consecutiveIdleTicks++;
  } else {
    state.consecutiveIdleTicks = 0;
    state.currentAction = decision.action;
    state.actionStartTick = currentTick;
  }

  // Check if decision phase just ran
  if (shouldRunBrainPhase(npcId, currentTick, 10)) {
    state.lastDecisionTick = currentTick;
  }

  // Check if planning phase just ran
  if (shouldRunBrainPhase(npcId, currentTick, 100)) {
    state.lastPlanningTick = currentTick;
  }
}

/**
 * Remove NPC from brain state tracking
 */
export function forgetBrainState(npcId: string): void {
  brainStates.delete(npcId);
}

/**
 * Get all NPC IDs that need planning this tick
 */
export function getNPCsForPlanning(
  currentTick: number,
  allNPCIds: string[],
  config: NPCBrainSchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): string[] {
  const candidates: string[] = [];
  
  for (const npcId of allNPCIds) {
    if (shouldRunBrainPhase(npcId, currentTick, config.planningInterval)) {
      candidates.push(npcId);
    }
  }

  // Limit batch size
  return candidates.slice(0, config.maxPlanningBatch);
}

// ============================================================================
// Brain Execution
// ============================================================================

export type BrainTickFn = (
  npcId: string,
  tick: number,
  phase: BrainPhase
) => void | Promise<void>;

export interface BrainExecutionContext {
  npcId: string;
  tick: number;
  memory: NPCMemoryV3;
}

/**
 * Execute brain tick for single NPC
 */
export async function executeBrainTick(
  context: BrainExecutionContext,
  phases: BrainPhase[],
  config: NPCBrainSchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): Promise<{
  decision: NPCDecision | null;
  decisionTick: number;
  planningTick: number;
}> {
  const { npcId, tick, memory } = context;
  const state = getBrainState(npcId);

  let decision: NPCDecision | null = null;
  const decisionTick = state.lastDecisionTick;
  const planningTick = state.lastPlanningTick;

  for (const phase of phases) {
    if (config.debug) {
      console.log(`[NPCBrain] ${npcId} phase ${phase} at tick ${tick}`);
    }

    switch (phase) {
      case BrainPhase.TICK:
        // Light operations happen every tick
        // Movement is handled by game systems
        // Just update state tracking
        break;

      case BrainPhase.DECISION:
        // Decision was already calculated, just update state
        if (state.currentAction) {
          // Check if action duration exceeded reasonable limit
          const actionDuration = tick - state.actionStartTick;
          if (actionDuration > 50) {
            // Force new decision
            state.consecutiveIdleTicks++;
          }
        }
        break;

      case BrainPhase.PLANNING:
        // Heavy operations
        // Memory compression, routine planning handled externally
        break;
    }
  }

  return { decision, decisionTick, planningTick };
}

// ============================================================================
// Scheduling Statistics
// ============================================================================

export interface SchedulerStats {
  totalNPCs: number;
  activeDecisionNPCs: number;
  activePlanningNPCs: number;
  idleNPCs: number;
  averageActionDuration: number;
}

/**
 * Get scheduler statistics
 */
export function getSchedulerStats(): SchedulerStats {
  let activeDecisionNPCs = 0;
  let activePlanningNPCs = 0;
  let idleNPCs = 0;
  let totalActionDuration = 0;

  for (const state of brainStates.values()) {
    if (state.consecutiveIdleTicks > 10) {
      idleNPCs++;
    } else if (state.lastPlanningTick > state.lastDecisionTick) {
      activePlanningNPCs++;
    } else if (state.lastDecisionTick > 0) {
      activeDecisionNPCs++;
    }

    totalActionDuration += Date.now() - state.actionStartTick;
  }

  return {
    totalNPCs: brainStates.size,
    activeDecisionNPCs,
    activePlanningNPCs,
    idleNPCs,
    averageActionDuration: brainStates.size > 0 
      ? totalActionDuration / brainStates.size 
      : 0,
  };
}

/**
 * Reset scheduler state (for testing or world reset)
 */
export function resetScheduler(): void {
  brainStates.clear();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate optimal tick intervals for target Hz
 */
export function calculateTickIntervals(targetHz: {
  tick: number;
  decision: number;
  planning: number;
}): NPCBrainSchedulerConfig {
  return {
    decisionInterval: Math.max(1, Math.round(10 / targetHz.decision)),
    planningInterval: Math.max(10, Math.round(10 / targetHz.planning)),
    maxPlanningBatch: 50,
    debug: false,
  };
}

/**
 * Get next tick when NPC will run decision phase
 */
export function getNextDecisionTick(npcId: string, currentTick: number): number {
  const phase = getNPCBrainPhase(npcId, 10);
  if (currentTick % 10 > phase) {
    return currentTick + (10 - (currentTick % 10)) + phase;
  }
  return currentTick + (phase - (currentTick % 10));
}

/**
 * Get next tick when NPC will run planning phase
 */
export function getNextPlanningTick(npcId: string, currentTick: number): number {
  const phase = getNPCBrainPhase(npcId, 100);
  if (currentTick % 100 > phase) {
    return currentTick + (100 - (currentTick % 100)) + phase;
  }
  return currentTick + (phase - (currentTick % 100));
}

/**
 * Estimate CPU load from scheduling
 */
export function estimateCPULoad(
  npcCount: number,
  config: NPCBrainSchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): {
  tickOpsPerSecond: number;
  decisionOpsPerSecond: number;
  planningOpsPerSecond: number;
  totalOpsPerSecond: number;
} {
  const tickOpsPerSecond = npcCount * 10; // Every tick
  const decisionOpsPerSecond = npcCount * (10 / config.decisionInterval);
  const planningOpsPerSecond = npcCount * (10 / config.planningInterval);

  return {
    tickOpsPerSecond,
    decisionOpsPerSecond,
    planningOpsPerSecond,
    totalOpsPerSecond: tickOpsPerSecond + decisionOpsPerSecond + planningOpsPerSecond,
  };
}