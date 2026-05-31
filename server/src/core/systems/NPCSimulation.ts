/**
 * @file server/src/core/systems/NPCSimulation.ts
 * @description STEP 6: NPC Simulation with Utility-based AI.
 * NPCs act based on scores, not rigid state machines.
 * Integrates with OraclePressureTags and SimDensityMap for performance.
 */

import { type SimDensityMap, DensityTier } from './ObserverEngine.js';
import { type OraclePressureTag, KAPPA } from '../state/RegionState.js';
import { worldStateRegistry } from '../state/WorldStateRegistry.js';
import { type PlayerIntent } from './AxiomValidationLayer.js';

/**
 * Fixed-Point constant
 */
const FP_SCALE = 1000;

/**
 * NPC Types with different need priorities
 */
export enum NPCType {
  MERCHANT = 'MERCHANT',   // Prioritizes profit
  SOLDIER = 'SOLDIER',     // Prioritizes safety/combat
  CIVILIAN = 'CIVILIAN',   // Balanced needs
}

/**
 * NPC Actions
 */
export enum NPCAction {
  GATHER_ENERGY = 'GATHER_ENERGY',
  TRADE = 'TRADE',
  DEFEND = 'DEFEND',
  FLEE = 'FLEE',
  PATROL = 'PATROL',
  IDLE = 'IDLE',
}

/**
 * Need categories (kappa=1000 weights)
 */
export interface NeedVector {
  safety: number;       // 0-1000 Fixed-Point
  profit: number;        // 0-1000 Fixed-Point
  matrixEnergy: number;   // 0-1000 Fixed-Point
}

/**
 * Goal with utility score
 */
export interface ScoredGoal {
  action: NPCAction;
  score: number;         // Fixed-Point (0-1000)
  targetPosition?: { x: number; y: number; z: number };
  targetRegion?: string;
}

/**
 * NPC Identity
 */
export interface NPCIdentity {
  npcId: string;
  name: string;
  faction: string;
  npcType: NPCType;
}

/**
 * Full NPC State
 */
export interface NPCState {
  identity: NPCIdentity;
  needs: NeedVector;
  goals: ScoredGoal[];
  stressLevel: number;
  position: { x: number; y: number; z: number };
  lastEvaluationTick: bigint;
  currentGoal?: ScoredGoal;
}

/**
 * NPC Update Result
 */
export interface NPCUpdateResult {
  npcId: string;
  needs: NeedVector;
  stressDelta: number;
  selectedAction?: NPCAction;
  generatedIntent?: PlayerIntent;
}

/**
 * Oracle pressure modifiers (impact on utility scores)
 */
const ORACLE_MODIFIERS: Record<string, Partial<Record<NPCAction, number>>> = {
  'HIGH_CONFLICT': {
    'TRADE': -300,
    'DEFEND': +400,
    'FLEE': +300,
    'GATHER_ENERGY': +100,
  },
  'DEPLETED_RESOURCES': {
    'TRADE': -200,
    'GATHER_ENERGY': +400,
    'IDLE': +100,
  },
  'ECONOMIC_BOOM': {
    'TRADE': +500,
    'GATHER_ENERGY': -100,
  },
  'SECURITY_BREACH': {
    'DEFEND': +500,
    'FLEE': +200,
    'TRADE': -300,
  },
  'RESOURCE_SURGE': {
    'TRADE': +200,
    'GATHER_ENERGY': +300,
  },
};

/**
 * NPC Type base weights (kappa=1000)
 */
const TYPE_BASE_WEIGHTS: Record<NPCType, NeedVector> = {
  [NPCType.MERCHANT]: { safety: 200, profit: 800, matrixEnergy: 400 },
  [NPCType.SOLDIER]: { safety: 800, profit: 200, matrixEnergy: 400 },
  [NPCType.CIVILIAN]: { safety: 400, profit: 400, matrixEnergy: 400 },
};

/**
 * Tier update intervals (ticks)
 */
const TIER_UPDATE_INTERVALS: Record<DensityTier, number> = {
  [DensityTier.TIER_0_FULL_REALTIME]: 1,    // Every tick
  [DensityTier.TIER_1_BATCHED]: 5,          // Every 5 ticks
  [DensityTier.TIER_2_ABSTRACT]: 10,        // Every 10 ticks
  [DensityTier.TIER_3_DORMANT]: 100,        // Every 100 ticks
};

/**
 * NPCSimulation - Utility-based AI for autonomous actors
 */
export class NPCSimulation {
  private npcs: Map<string, NPCState> = new Map();
  private currentTick: bigint = BigInt(0);
  private intents: PlayerIntent[] = [];

  /**
   * Update all NPCs based on density map
   */
  public async update(densityMap: SimDensityMap): Promise<NPCUpdateResult[]> {
    this.currentTick = worldStateRegistry.getTick();
    const results: NPCUpdateResult[] = [];

    // Level-A Simulation requires deterministic iteration over entity collections.
    // Map iteration order is non-deterministic in Node.js (insertion order based).
    const sortedNpcIds = Array.from(this.npcs.keys()).sort();

    for (const npcId of sortedNpcIds) {
      const npc = this.npcs.get(npcId)!;
      // Check tier for NPC position
      const chunkId = this.getChunkForPosition(npc.position);
      const tier = densityMap.chunks.get(chunkId)?.densityTier ?? DensityTier.TIER_3_DORMANT;
      
      // Performance coupling: skip based on tier
      const shouldUpdate = this.shouldEvaluate(npc, tier);
      if (!shouldUpdate) {
        continue;
      }

      // Get Oracle pressures for region
      const pressures = this.getRegionPressures(chunkId);

      // Calculate utility scores
      const goals = this.calculateUtilityScores(npc, pressures);

      // Select best action
      const selectedGoal = this.selectBestGoal(goals);
      npc.currentGoal = selectedGoal;

      // Generate valid intent (respects Axiom 2 and 4)
      const intent = this.generateIntent(npc, selectedGoal, densityMap);
      if (intent) {
        this.intents.push(intent);
      }

      // Update needs based on action
      const needs = this.updateNeeds(npc, selectedGoal.action, pressures);
      const stressDelta = this.calculateStressDelta(npc, needs);

      npc.needs = needs;
      npc.stressLevel = Math.max(0, Math.min(FP_SCALE, npc.stressLevel + stressDelta));
      npc.lastEvaluationTick = this.currentTick;

      results.push({
        npcId,
        needs,
        stressDelta,
        selectedAction: selectedGoal.action,
        generatedIntent: intent,
      });
    }

    return results;
  }

  /**
   * Determine if NPC should evaluate this tick
   */
  private shouldEvaluate(npc: NPCState, tier: DensityTier): boolean {
    const interval = TIER_UPDATE_INTERVALS[tier];
    const ticksSinceLastEval = Number(this.currentTick - npc.lastEvaluationTick);
    return ticksSinceLastEval >= interval;
  }

  /**
   * Get Oracle pressures for region
   */
  private getRegionPressures(chunkId: string): OraclePressureTag[] {
    const worldState = worldStateRegistry.getCurrentState();
    // Map chunk to region (simplified)
    const region = worldState.regions.get(chunkId);
    return region?.oraclePressureTags ?? [];
  }

  /**
   * Calculate utility scores for each possible action
   */
  private calculateUtilityScores(
    npc: NPCState,
    pressures: OraclePressureTag[]
  ): ScoredGoal[] {
    const baseWeights = TYPE_BASE_WEIGHTS[npc.identity.npcType];
    const goals: ScoredGoal[] = [];

    // Calculate base score for each action
    const actions = [
      NPCAction.GATHER_ENERGY,
      NPCAction.TRADE,
      NPCAction.DEFEND,
      NPCAction.FLEE,
      NPCAction.PATROL,
      NPCAction.IDLE,
    ];

    for (const action of actions) {
      let score = this.getBaseScore(action, baseWeights);

      // Apply Oracle pressure modifiers
      for (const pressure of pressures) {
        const modifier = ORACLE_MODIFIERS[pressure]?.[action] ?? 0;
        score += modifier;
      }

      // Apply current needs (urgent needs boost relevant actions)
      score += this.getNeedModifier(npc, action);

      // Clamp to 0-1000
      score = Math.max(0, Math.min(FP_SCALE, score));

      goals.push({ action, score });
    }

    return goals;
  }

  /**
   * Get base score for action based on NPC type
   */
  private getBaseScore(action: NPCAction, weights: NeedVector): number {
    switch (action) {
      case NPCAction.GATHER_ENERGY:
        return weights.matrixEnergy;
      case NPCAction.TRADE:
        return weights.profit;
      case NPCAction.DEFEND:
        return weights.safety;
      case NPCAction.FLEE:
        return FP_SCALE - weights.safety; // Inverse of safety
      case NPCAction.PATROL:
        return (weights.safety + weights.profit) / 2;
      case NPCAction.IDLE:
        return 200; // Base idle score
      default:
        return 100;
    }
  }

  /**
   * Get modifier based on current needs
   */
  private getNeedModifier(npc: NPCState, action: NPCAction): number {
    const { safety, profit, matrixEnergy } = npc.needs;
    const urgency = 300; // How much needs affect scores

    switch (action) {
      case NPCAction.GATHER_ENERGY:
        return (FP_SCALE - matrixEnergy) * urgency / FP_SCALE;
      case NPCAction.TRADE:
        return (FP_SCALE - profit) * urgency / FP_SCALE;
      case NPCAction.DEFEND:
      case NPCAction.FLEE:
        return (FP_SCALE - safety) * urgency / FP_SCALE;
      default:
        return 0;
    }
  }

  /**
   * Select best goal by highest score
   */
  private selectBestGoal(goals: ScoredGoal[]): ScoredGoal {
    return goals.reduce((best, current) => 
      current.score > best.score ? current : best
    , goals[0]);
  }

  /**
   * Generate valid intent (respects Axiom 2 & 4)
   */
  private generateIntent(
    npc: NPCState,
    goal: ScoredGoal,
    densityMap: SimDensityMap
  ): PlayerIntent | undefined {
    if (goal.action === NPCAction.IDLE) {
      return undefined;
    }

    const intent: PlayerIntent = {
      playerId: npc.identity.npcId,
      action: this.actionToIntentAction(goal.action),
      sequenceId: this.currentTick + BigInt(1), // Axiom 2: n+1
      regionId: this.getChunkForPosition(npc.position),
      lastPosition: { ...npc.position },
      newPosition: goal.targetPosition ? { ...goal.targetPosition } : undefined,
    };

    // Validate movement distance (Axiom 4)
    if (goal.targetPosition && npc.position) {
      const distance = this.calculateDistance(npc.position, goal.targetPosition);
      const maxMovement = FP_SCALE * 10; // 10 units max

      if (distance > maxMovement) {
        // Clamp to max
        goal.targetPosition = this.clampPosition(npc.position, goal.targetPosition, maxMovement);
        intent.newPosition = goal.targetPosition;
      }
    }

    return intent;
  }

  /**
   * Map NPC action to intent action
   */
  private actionToIntentAction(action: NPCAction): any {
    switch (action) {
      case NPCAction.GATHER_ENERGY:
      case NPCAction.TRADE:
        return 'EXTRACT';
      case NPCAction.DEFEND:
      case NPCAction.FLEE:
      case NPCAction.PATROL:
        return 'MOVE';
      default:
        return 'MOVE';
    }
  }

  /**
   * Update needs after action
   */
  private updateNeeds(
    npc: NPCState,
    action: NPCAction,
    pressures: OraclePressureTag[]
  ): NeedVector {
    let { safety, profit, matrixEnergy } = npc.needs;
    const decay = 50; // Natural need growth

    // Apply action effects
    switch (action) {
      case NPCAction.GATHER_ENERGY:
        matrixEnergy = Math.min(FP_SCALE, matrixEnergy + 100);
        break;
      case NPCAction.TRADE:
        profit = Math.min(FP_SCALE, profit + 150);
        break;
      case NPCAction.DEFEND:
        safety = Math.min(FP_SCALE, safety + 100);
        break;
      case NPCAction.FLEE:
        // Fleeing doesn't improve needs, just avoids danger
        break;
    }

    // Natural decay
    safety = Math.max(0, safety - decay);
    profit = Math.max(0, profit - decay);
    matrixEnergy = Math.max(0, matrixEnergy - decay);

    return { safety, profit, matrixEnergy };
  }

  /**
   * Calculate stress delta
   */
  private calculateStressDelta(npc: NPCState, needs: NeedVector): number {
    let stress = 0;

    // Low needs increase stress
    if (needs.safety < 300) stress += 100;
    if (needs.matrixEnergy < 200) stress += 80;
    if (needs.profit < 200) stress += 50;

    return stress;
  }

  /**
   * Get chunk ID from position
   */
  private getChunkForPosition(pos: { x: number; y: number; z: number }): string {
    return `${Math.floor(pos.x / 16)}_${Math.floor(pos.z / 16)}`;
  }

  /**
   * Calculate distance in Fixed-Point
   */
  private calculateDistance(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number }
  ): number {
    const dx = (a.x - b.x) * FP_SCALE;
    const dy = (a.y - b.y) * FP_SCALE;
    const dz = (a.z - b.z) * FP_SCALE;
    return Math.floor(Math.sqrt(dx * dx + dy * dy + dz * dz));
  }

  /**
   * Clamp position to max distance
   */
  private clampPosition(
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
    maxDist: number
  ): { x: number; y: number; z: number } {
    const dist = this.calculateDistance(from, to);
    if (dist <= maxDist) return to;

    // Scale down
    const ratio = maxDist / dist;
    return {
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
      z: from.z + (to.z - from.z) * ratio,
    };
  }

  /**
   * Register NPC
   */
  public registerNPC(state: NPCState): void {
    this.npcs.set(state.identity.npcId, state);
  }

  /**
   * Get NPC by ID
   */
  public getNPC(id: string): NPCState | undefined {
    return this.npcs.get(id);
  }

  /**
   * Get all generated intents
   */
  public getIntents(): PlayerIntent[] {
    return [...this.intents];
  }

  /**
   * Clear intents after processing
   */
  public clearIntents(): void {
    this.intents = [];
  }

  /**
   * Get all NPCs
   */
  public getAllNPCs(): NPCState[] {
    // Ensure deterministic order for Level-A simulation consistency
    return Array.from(this.npcs.values()).sort((a, b) => {
      const idA = a.identity.npcId;
      const idB = b.identity.npcId;
      return idA < idB ? -1 : idA > idB ? 1 : 0;
    });
  }
}