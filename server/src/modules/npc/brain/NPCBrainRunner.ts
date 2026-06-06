/**
 * NPCBrainRunner — Main Brain Loop Integration
 * 
 * Ties together all brain components:
 * - NPCMemoryV3: Memory types
 * - NPCObservationBus: World event input
 * - NPCMemoryScoring: Memory importance
 * - NPCDecisionEngine: Action selection
 * - NPCBrainScheduler: Tick-based phases
 * - NPCMemoryCompression: State management
 * - NPCBrainDebugSnapshot: Debug support
 * 
 * Usage:
 *   const runner = new NPCBrainRunner();
 *   const output = runner.runNPCBrain(input);
 */

import { stableHash32 } from "../../../core/determinism/AREDeterminism.js";

/**
 * Stable string comparison using hash (deterministic replacement for localeCompare)
 */
function stableStringCompare(a: string, b: string): number {
  return stableHash32(a) - stableHash32(b);
}

import type {
  NPCDecisionInput,
  NPCDecision,
  NPCMemoryV3,
  NPCObservation,
  NPCWorldSnapshot,
  NPCBrainOutput,
  NPCActionType,
} from "./NPCMemoryV3.js";
import { createEmptyNPCMemoryV3 } from "./NPCMemoryV3.js";
import { NPCObservationBus, globalObservationBus } from "./NPCObservationBus.js";
import {
  scoreMemory,
  shouldStoreMemory,
  observationToEpisodic,
  applyObservationsToMemory,
  updateRelationsFromObservation,
} from "./NPCMemoryScoring.js";
import { decideNPCAction, applyActionOutcome, calculateOutcomeScore } from "./NPCDecisionEngine.js";
import {
  getActivePhases,
  getBrainState,
  updateBrainState,
  BrainPhase,
  DEFAULT_SCHEDULER_CONFIG,
  type NPCBrainSchedulerConfig,
} from "./NPCBrainScheduler.js";
import {
  compressNPCMemory,
  shouldCompress,
  DEFAULT_COMPRESSION_CONFIG,
  type MemoryCompressionConfig,
} from "./NPCMemoryCompression.js";
import { createNPCBrainDebugSnapshot, type NPCBrainDebugSnapshot } from "./NPCBrainDebugSnapshot.js";

// ============================================================================
// NPC Brain Runner
// ============================================================================

export class NPCBrainRunner {
  private observationBus: NPCObservationBus;
  private lastCompressionTicks: Map<string, number> = new Map();
  private config: NPCBrainSchedulerConfig;
  private compressionConfig: MemoryCompressionConfig;

  constructor(
    observationBus: NPCObservationBus = globalObservationBus,
    config?: Partial<NPCBrainSchedulerConfig>,
    compressionConfig?: Partial<MemoryCompressionConfig>
  ) {
    this.observationBus = observationBus;
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
    this.compressionConfig = { ...DEFAULT_COMPRESSION_CONFIG, ...compressionConfig };
  }

  /**
   * Run NPC brain tick
   */
  runNPCBrain(input: NPCDecisionInput): NPCBrainOutput {
    const { tick, npcId, memory } = input;
    
    // Get active phases for this tick
    const phases = getActivePhases(npcId, tick, this.config);
    
    // Track current state
    const state = getBrainState(npcId);

    // ─── PHASE 1: TICK (10 Hz) ────────────────────────────────────────────────
    // Light operations: get observations, check danger

    // Get observations for this NPC
    const observations = this.observationBus.getObservationsForNPC(npcId, memory);

    // Apply observations to memory
    let updatedMemory = applyObservationsToMemory(memory, observations, tick);

    // Update relations from observations
    for (const obs of observations) {
      updatedMemory = {
        ...updatedMemory,
        relations: updateRelationsFromObservation(updatedMemory.relations, obs, tick),
      };
    }

    // ─── PHASE 2: DECISION (1 Hz) ─────────────────────────────────────────────
    
    let decision: NPCDecision | null = null;
    
    if (phases.includes(BrainPhase.DECISION)) {
      // Make decision
      decision = decideNPCAction(input);
      
      // Update brain state
      updateBrainState(npcId, decision, tick);
    }

    // ─── PHASE 3: PLANNING (0.1 Hz) ───────────────────────────────────────────

    const lastCompressionTick = this.lastCompressionTicks.get(npcId) ?? 0;
    
    if (phases.includes(BrainPhase.PLANNING) && shouldCompress(npcId, tick, lastCompressionTick, this.compressionConfig)) {
      // Compress memory
      updatedMemory = compressNPCMemory(updatedMemory, tick, this.compressionConfig);
      this.lastCompressionTicks.set(npcId, tick);
    }

    // ─── Calculate Next State ─────────────────────────────────────────────────

    const nextState = decisionToState(decision);

    // ─── Calculate Memory Hash ────────────────────────────────────────────────

    const memoryHash = this.calculateMemoryHash(updatedMemory);

    return {
      npcId,
      tick,
      nextState,
      decision: decision ?? { action: "idle", reason: "no_decision", score: 0, confidence: 0 },
      memory: updatedMemory,
      memoryHash,
    };
  }

  /**
   * Run NPC brain with full context (for Ouroboros integration)
   */
  runWithContext(params: {
    npcId: string;
    npcName: string;
    position: { x: number; y: number };
    homeRegionId: string;
    factionId?: string;
    state: string;
    health: number;
    energy: number;
    gold: number;
    memory: NPCMemoryV3;
    nearbyEntities: Array<{
      id: string;
      name: string;
      type: "player" | "npc" | "monster";
      position: { x: number; y: number };
      faction?: string;
      hostile?: boolean;
    }>;
    tick: number;
    worldSnapshot: NPCWorldSnapshot;
  }): NPCBrainOutput {
    const input: NPCDecisionInput = {
      tick: params.tick,
      npcId: params.npcId,
      npcName: params.npcName,
      position: params.position,
      homeRegionId: params.homeRegionId,
      factionId: params.factionId,
      state: params.state,
      health: params.health,
      energy: params.energy,
      gold: params.gold,
      memory: params.memory,
      world: params.worldSnapshot,
      nearbyEntities: params.nearbyEntities,
    };

    return this.runNPCBrain(input);
  }

  /**
   * Apply action outcome for learning
   */
  applyLearning(
    memory: NPCMemoryV3,
    action: NPCActionType,
    result: {
      success: boolean;
      damageDealt?: number;
      damageTaken?: number;
      goldGained?: number;
      goldSpent?: number;
      socialGain?: number;
    },
    contextKey: string,
    tick: number
  ): NPCMemoryV3 {
    const outcomeScore = calculateOutcomeScore(action, result);
    return applyActionOutcome(memory, action, contextKey, outcomeScore, tick);
  }

  /**
   * Get debug snapshot
   */
  getDebugSnapshot(
    npcId: string,
    tick: number,
    state: string,
    memory: NPCMemoryV3,
    decision: NPCDecision | null
  ): NPCBrainDebugSnapshot {
    return createNPCBrainDebugSnapshot(npcId, tick, state, memory, decision);
  }

  /**
   * Calculate memory hash for verification
   */
  private calculateMemoryHash(memory: NPCMemoryV3): string {
    const components = [
      memory.identity.npcId,
      memory.identity.homeRegionId,
      memory.goals.length,
      memory.episodic.length,
      memory.semantic.length,
      Object.keys(memory.relations).length,
      JSON.stringify(
        Object.entries(memory.learning.actionScores)
          .sort((a, b) => stableStringCompare(a[0], b[0]))
          .slice(0, 10)
      ),
    ];

    const hash = stableHash32(components.join("||"));
    return hash.toString(16).padStart(8, "0");
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    observationBusStats: ReturnType<NPCObservationBus["getStats"]>;
    compressionStats: {
      totalCompressed: number;
      lastCompressionTicks: number;
    };
  } {
    return {
      observationBusStats: this.observationBus.getStats(),
      compressionStats: {
        totalCompressed: this.lastCompressionTicks.size,
        lastCompressionTicks: [...this.lastCompressionTicks.values()].length,
      },
    };
  }

  /**
   * Reset all state (for testing or world reset)
   */
  reset(): void {
    this.lastCompressionTicks.clear();
    this.observationBus.clearHistory();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert decision to NPC state string
 */
export function decisionToState(decision: NPCDecision | null): string {
  if (!decision) return "idle";

  const actionStateMap: Record<NPCActionType, string> = {
    idle: "idle",
    talk: "social",
    trade: "trading",
    flee: "idle",
    attack: "combat",
    patrol: "wandering",
    work: "collecting",
    gather: "collecting",
    craft: "collecting",
    join_guild: "social",
    vote: "social",
    raise_alarm: "combat",
    move_city: "wandering",
    hire_guard: "social",
    start_caravan: "trading",
    explore: "wandering",
    social: "social",
    defend: "combat",
  };

  return actionStateMap[decision.action] ?? "idle";
}

/**
 * Create default world snapshot
 */
export function createDefaultWorldSnapshot(
  tick: number,
  regionId: string
): NPCWorldSnapshot {
  return {
    tick,
    regionId,
    timeOfDay: (tick % 1000) / 1000 * 24, // 0-24 hours
    dangerLevel: 0.1,
    resourceAvailability: {},
    marketPrices: {},
    nearbyThreats: [],
    friendlyNPCs: [],
    hostileNPCs: [],
  };
}

// ============================================================================
// Global Runner Instance
// ============================================================================

export const globalNPCBrainRunner = new NPCBrainRunner();