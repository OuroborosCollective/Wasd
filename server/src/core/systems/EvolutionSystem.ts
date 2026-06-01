/**
 * @file server/src/core/systems/EvolutionSystem.ts
 * @description STEP 10: World Flow & Regional Evolution.
 * Complete implementation - world metamorphosis system.
 */

import { type RegionState, StabilityLevel, KAPPA, OraclePressureTag } from '../state/RegionState.js';
import { worldStateRegistry, type PendingMutation } from '../state/WorldStateRegistry.js';

/**
 * Fixed-Point constant
 */
const FP_SCALE = 1000;

/**
 * Convert to Fixed-Point
 */
function toFP(value: number): number {
  return Math.floor(value * FP_SCALE);
}

/**
 * Grid chunk position (for performance)
 */
interface GridChunk {
  gridX: number;
  gridZ: number;
}

/**
 * Travel corridor heat data
 */
export interface TravelCorridor {
  fromChunk: string;
  toChunk: string;
  intensity: number; // Fixed-Point (0-1000)
  playerCount: number;
}

/**
 * Flow directive from Oracle
 */
export interface FlowDirective {
  directiveId: string;
  fromChunk: string;
  toChunk: string;
  type: 'PUSH' | 'PULL' | 'DISPERSE';
  intensity: number;
}

/**
 * Stability drift analysis
 */
export interface StabilityDrift {
  regionId: string;
  drift: number;
  phase: StabilityLevel;
  lastChange: bigint;
  consecutiveOverThreshold: number;
}

/**
 * Service shutdown event
 */
export interface ServiceShutdownEvent {
  regionId: string;
  services: string[];
  reason: 'PARTIAL_COLLAPSE' | 'TOTAL_COLLAPSE';
  tick: bigint;
}

/**
 * Evolution thresholds (Fixed-Point)
 */
const STABILITY_THRESHOLDS: Record<StabilityLevel, number> = {
  [StabilityLevel.STABLE]: 0,
  [StabilityLevel.UNSTABLE]: toFP(0.3),
  [StabilityLevel.CONTESTED]: toFP(0.6),
  [StabilityLevel.CRITICAL]: toFP(0.8),
  [StabilityLevel.PARTIAL_COLLAPSE]: toFP(0.9),
  [StabilityLevel.TOTAL_COLLAPSE]: toFP(1.0),
};

/**
 * Phase change cooldown (600-6000 ticks based on phase)
 */
const PHASE_COOLDOWNS: Record<StabilityLevel, bigint> = {
  [StabilityLevel.STABLE]: BigInt(600),
  [StabilityLevel.UNSTABLE]: BigInt(1200),
  [StabilityLevel.CONTESTED]: BigInt(2400),
  [StabilityLevel.CRITICAL]: BigInt(3600),
  [StabilityLevel.PARTIAL_COLLAPSE]: BigInt(6000),
  [StabilityLevel.TOTAL_COLLAPSE]: BigInt(6000),
};

/**
 * Visual corruption per phase
 */
const VISUAL_CORRUPTION_VALUES: Record<StabilityLevel, number> = {
  [StabilityLevel.STABLE]: toFP(0.0),
  [StabilityLevel.UNSTABLE]: toFP(0.1),
  [StabilityLevel.CONTESTED]: toFP(0.25),
  [StabilityLevel.CRITICAL]: toFP(0.5),
  [StabilityLevel.PARTIAL_COLLAPSE]: toFP(0.75),
  [StabilityLevel.TOTAL_COLLAPSE]: toFP(1.0),
};

function directiveId(prefix: string, ...parts: unknown[]): string {
  return [prefix, ...parts.map((part) => String(part).replace(/[^a-zA-Z0-9_.:-]/g, '_'))].join('_');
}

/**
 * EvolutionSystem - World Flow and Regional Evolution
 */
export class EvolutionSystem {
  // World Flow Model
  private travelHeat: Map<string, TravelCorridor> = new Map();
  private flowDirectives: FlowDirective[] = [];
  private chunkPlayers: Map<string, Set<string>> = new Map();
  
  // Stability tracking
  private drifts: Map<string, StabilityDrift> = new Map();
  private pendingShutdowns: ServiceShutdownEvent[] = [];
  
  // Configuration
  private readonly MIN_EVOLUTION_INTERVAL = BigInt(600); // 60 seconds at 10Hz
  private readonly MAX_DRIFT = toFP(1.0);
  private readonly SOG_THRESHOLD = toFP(0.7); // 70% player concentration = sogeffect

  /**
   * 1. World Flow Model - Collect Travel Data (Phase 2.3)
   * Uses grid chunks for performance
   */
  public collectTravelData(
    playerId: string,
    fromPosition: { x: number; y: number; z: number },
    toPosition: { x: number; y: number; z: number }
  ): void {
    const fromChunk = this.getChunkKey(fromPosition);
    const toChunk = this.getChunkKey(toPosition);
    
    if (fromChunk === toChunk) return; // Same chunk, no travel
    
    // Update chunk player count
    this.updateChunkPlayer(fromChunk, playerId, false);
    this.updateChunkPlayer(toChunk, playerId, true);
    
    // Update corridor heat
    const key = `${fromChunk}->${toChunk}`;
    const corridor = this.travelHeat.get(key);
    
    if (corridor) {
      corridor.intensity = Math.min(FP_SCALE, corridor.intensity + 5);
      corridor.playerCount++;
    } else {
      this.travelHeat.set(key, {
        fromChunk,
        toChunk,
        intensity: 5,
        playerCount: 1,
      });
    }
  }

  /**
   * Update player in chunk
   */
  private updateChunkPlayer(chunk: string, playerId: string, add: boolean): void {
    let players = this.chunkPlayers.get(chunk);
    if (!players) {
      players = new Set();
      this.chunkPlayers.set(chunk, players);
    }
    
    if (add) {
      players.add(playerId);
    } else {
      players.delete(playerId);
    }
  }

  /**
   * Get chunk key from position (grid optimization)
   */
  private getChunkKey(pos: { x: number; y: number; z: number }): string {
    const gridX = Math.floor(pos.x / 32); // 32-unit chunks
    const gridZ = Math.floor(pos.z / 32);
    return `${gridX}_${gridZ}`;
  }

  /**
   * Detect Sog-Effekte (grouping) and generate FlowDirectives
   */
  public analyzeFlowPatterns(): void {
    this.flowDirectives = [];
    
    // Find high-traffic corridors (potential sogeffekt)
    // Sorted keys for absolute determinism in FlowDirective generation
    const sortedHeatKeys = Array.from(this.travelHeat.keys()).sort();
    for (const key of sortedHeatKeys) {
      const corridor = this.travelHeat.get(key)!;
      if (corridor.intensity > this.SOG_THRESHOLD) {
        // This is a "pull" effect - too many players going to same place
        this.flowDirectives.push({
          directiveId: directiveId('flow', key, corridor.fromChunk, corridor.toChunk),
          fromChunk: corridor.fromChunk,
          toChunk: corridor.toChunk,
          type: 'PULL',
          intensity: corridor.intensity,
        });
      }
    }
    
    // Find empty chunks that were previously active (disperese effect)
    // Sorted keys for absolute determinism in FlowDirective generation
    const sortedChunkKeys = Array.from(this.chunkPlayers.keys()).sort();
    for (const chunk of sortedChunkKeys) {
      const players = this.chunkPlayers.get(chunk)!;
      if (players.size === 0) {
        // Check if this was a destination - might need to disperse
        // We sort heat values by key to maintain deterministic directive order
        const sortedHeatValues = Array.from(this.travelHeat.entries())
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([, v]) => v);

        for (const corridor of sortedHeatValues) {
          if (corridor.toChunk === chunk && corridor.intensity < toFP(0.1)) {
            this.flowDirectives.push({
              directiveId: directiveId('disperse', chunk, corridor.fromChunk, corridor.toChunk),
              fromChunk: corridor.fromChunk,
              toChunk: chunk,
              type: 'DISPERSE',
              intensity: toFP(0.3),
            });
          }
        }
      }
    }
  }

  /**
   * 2. Regional Evolution Model (Phase 2.13)
   * Batched every 600-6000 ticks
   */
  public evolveRegions(): void {
    const currentTick = worldStateRegistry.getTick();
    const worldState = worldStateRegistry.getCurrentState();
    
    // Sorted region IDs for absolute deterministic evolution order
    const sortedRegionIds = Array.from(worldState.regions.keys()).sort();
    for (const regionId of sortedRegionIds) {
      const region = worldState.regions.get(regionId)!;
      this.evaluateStability(regionId, region, currentTick);
    }
    
    // Apply any service shutdowns
    this.applyShutdowns();
  }

  /**
   * Evaluate stability and calculate drift
   */
  private evaluateStability(
    regionId: string,
    region: RegionState,
    currentTick: bigint
  ): void {
    // Calculate drift from factors
    let drift = 0;
    
    // Factor 1: Conflict Pressure
    const conflictDrift = this.calculateConflictDrift(region);
    drift += conflictDrift;
    
    // Factor 2: Maintenance Debt
    const maintenanceDrift = this.calculateMaintenanceDrift(region);
    drift += maintenanceDrift;
    
    // Factor 3: Energy Flow
    const energyDrift = this.calculateEnergyDrift(region);
    drift += energyDrift;
    
    // Clamp drift
    drift = Math.max(0, Math.min(this.MAX_DRIFT, drift));
    
    // Update tracking
    const existingDrift = this.drifts.get(regionId);
    if (existingDrift) {
      // Check consecutive over threshold
      if (drift > STABILITY_THRESHOLDS[region.stabilityLevel]) {
        existingDrift.consecutiveOverThreshold++;
      } else {
        existingDrift.consecutiveOverThreshold = 0;
      }
      existingDrift.drift = drift;
    } else {
      this.drifts.set(regionId, {
        regionId,
        drift,
        phase: region.stabilityLevel,
        lastChange: region.lastPhaseChange,
        consecutiveOverThreshold: 0,
      });
    }
    
    // Check for phase change with hysteresis
    this.attemptPhaseChange(regionId, region, drift, currentTick);
  }

  /**
   * Calculate conflict contribution to drift
   */
  private calculateConflictDrift(region: RegionState): number {
    let drift = 0;
    
    // High threat level increases drift
    if (region.threatLevel > STABILITY_THRESHOLDS[StabilityLevel.UNSTABLE]) {
      drift += region.threatLevel;
    }
    
    // HIGH_CONFLICT pressure
    if (region.oraclePressureTags.includes('HIGH_CONFLICT' as OraclePressureTag)) {
      drift += toFP(0.3);
    }
    
    // BANDIT_RAID
    if (region.oraclePressureTags.includes('BANDIT_RAID' as OraclePressureTag)) {
      drift += toFP(0.4);
    }
    
    return drift;
  }

  /**
   * Calculate maintenance debt contribution
   */
  private calculateMaintenanceDrift(region: RegionState): number {
    let drift = 0;
    
    // Infrastructure decay increases drift
    if (region.infrastructureLevel < toFP(0.5)) {
      drift += (toFP(0.5) - region.infrastructureLevel) * 2;
    }
    
    // Maintenance deficit pressure
    if (region.oraclePressureTags.includes('MAINTENANCE_DEFICIT' as OraclePressureTag)) {
      drift += toFP(0.25);
    }
    
    return drift;
  }

  /**
   * Calculate energy flow contribution
   */
  private calculateEnergyDrift(region: RegionState): number {
    let drift = 0;
    
    // Low energy = high drift
    if (region.matrixEnergyBalance < toFP(20)) {
      drift += (toFP(20) - region.matrixEnergyBalance) * 10;
    }
    
    return drift;
  }

  /**
   * Attempt phase change with hysteresis
   * Only changes if threshold exceeded for cooldown period
   */
  private attemptPhaseChange(
    regionId: string,
    region: RegionState,
    drift: number,
    currentTick: bigint
  ): void {
    const timeSinceChange = currentTick - region.lastPhaseChange;
    const cooldown = PHASE_COOLDOWNS[region.stabilityLevel] || BigInt(600);
    
    // Check cooldown
    if (timeSinceChange < cooldown) {
      return;
    }
    
    // Determine new phase based on drift
    let newPhase: StabilityLevel | undefined;
    
    // State machine transitions
    const driftOver = drift > STABILITY_THRESHOLDS[region.stabilityLevel];
    const consecutiveRequired = 10; // Need 10 consecutive evaluations
    
    const trackedDrift = this.drifts.get(regionId);
    const consecutiveOK = trackedDrift && trackedDrift.consecutiveOverThreshold >= consecutiveRequired;
    
    // Forward transitions (getting worse)
    if (driftOver && consecutiveOK) {
      if (region.stabilityLevel === StabilityLevel.STABLE) {
        newPhase = StabilityLevel.UNSTABLE;
      } else if (region.stabilityLevel === StabilityLevel.UNSTABLE) {
        newPhase = StabilityLevel.CONTESTED;
      } else if (region.stabilityLevel === StabilityLevel.CONTESTED) {
        newPhase = StabilityLevel.CRITICAL;
      } else if (region.stabilityLevel === StabilityLevel.CRITICAL) {
        newPhase = StabilityLevel.PARTIAL_COLLAPSE;
      }
    }
    
    // Backward transition (recovering) - requires lower threshold
    if (drift < STABILITY_THRESHOLDS[StabilityLevel.STABLE] && region.stabilityLevel !== StabilityLevel.STABLE) {
      // Can only heal if significantly below current threshold
      const healThreshold = Math.max(0, STABILITY_THRESHOLDS[region.stabilityLevel] - toFP(0.3));
      if (drift < healThreshold) {
        // Step back one phase
        if (region.stabilityLevel === StabilityLevel.PARTIAL_COLLAPSE) {
          newPhase = StabilityLevel.CRITICAL;
        } else if (region.stabilityLevel === StabilityLevel.CRITICAL) {
          newPhase = StabilityLevel.CONTESTED;
        } else if (region.stabilityLevel === StabilityLevel.CONTESTED) {
          newPhase = StabilityLevel.UNSTABLE;
        } else if (region.stabilityLevel === StabilityLevel.UNSTABLE) {
          newPhase = StabilityLevel.STABLE;
        }
      }
    }
    
    // Apply change if new phase
    if (newPhase && newPhase !== region.stabilityLevel) {
      this.applyPhaseChange(regionId, region, newPhase, currentTick);
    }
  }

  /**
   * 3. Metamorphose & Visuals
   * Apply phase change with visual corruption
   */
  private applyPhaseChange(
    regionId: string,
    region: RegionState,
    newPhase: StabilityLevel,
    currentTick: bigint
  ): void {
    // Set new phase
    worldStateRegistry.queueMutation({
      type: 'SET_REGION_FIELD',
      regionId,
      field: 'stabilityLevel',
      value: newPhase,
    });
    
    // Set last change timestamp
    worldStateRegistry.queueMutation({
      type: 'SET_REGION_FIELD',
      regionId,
      field: 'lastPhaseChange',
      value: currentTick,
    });
    
    // Set visual corruption (global shader parameter)
    const corruption = VISUAL_CORRUPTION_VALUES[newPhase];
    worldStateRegistry.queueMutation({
      type: 'SET_REGION_FIELD',
      regionId,
      field: 'visualCorruptionState',
      value: Math.max(region.visualCorruptionState, corruption),
    });
    
    // 4. Kausale Rückkopplung - Trigger service shutdown for partial collapse
    if (newPhase === StabilityLevel.PARTIAL_COLLAPSE || newPhase === StabilityLevel.TOTAL_COLLAPSE) {
      this.queueServiceShutdown(regionId, newPhase);
    }
  }

  /**
   * Queue service shutdown for partial/total collapse
   */
  private queueServiceShutdown(regionId: string, phase: StabilityLevel): void {
    const services: string[] = [];
    
    // Which services to shut down
    if (phase === StabilityLevel.PARTIAL_COLLAPSE) {
      services.push('ECONOMY', 'SPAWN');
    } else if (phase === StabilityLevel.TOTAL_COLLAPSE) {
      services.push('ECONOMY', 'SPAWN', 'QUEST', 'TRADE');
    }
    
    this.pendingShutdowns.push({
      regionId,
      services,
      reason: phase === StabilityLevel.TOTAL_COLLAPSE ? 'TOTAL_COLLAPSE' : 'PARTIAL_COLLAPSE',
      tick: worldStateRegistry.getTick(),
    });
  }

  /**
   * Apply pending shutdowns
   */
  private applyShutdowns(): void {
    for (const shutdown of this.pendingShutdowns) {
      // Apply to region state
      worldStateRegistry.queueMutation({
        type: 'SET_REGION_FIELD',
        regionId: shutdown.regionId,
        field: 'activeServices',
        value: shutdown.services,
      });
    }
    this.pendingShutdowns = [];
  }

  /**
   * Get travel heat for all corridors
   */
  public getTravelHeat(): TravelCorridor[] {
    return [...this.travelHeat.values()];
  }

  /**
   * Get flow directives for Oracle
   */
  public getFlowDirectives(): FlowDirective[] {
    return [...this.flowDirectives];
  }

  /**
   * Get stability drift for region
   */
  public getStabilityDrift(regionId: string): StabilityDrift | undefined {
    return this.drifts.get(regionId);
  }

  /**
   * Get pending shutdowns
   */
  public getPendingShutdowns(): ServiceShutdownEvent[] {
    return [...this.pendingShutdowns];
  }

  /**
   * Clear old travel data (cleanup)
   */
  public clearTravelData(): void {
    // Clear old corridors with low intensity
    // Sorted keys for deterministic cleanup order (Level-A)
    const sortedKeys = Array.from(this.travelHeat.keys()).sort();
    for (const key of sortedKeys) {
      const corridor = this.travelHeat.get(key)!;
      if (corridor.intensity < toFP(0.05)) {
        this.travelHeat.delete(key);
      }
    }
  }
}