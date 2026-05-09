/**
 * @file server/src/core/systems/EvolutionSystem.ts
 * @description STEP 10: World Flow & Regional Evolution with StabilityDrift.
 */

import { type RegionState, StabilityLevel, KAPPA } from '../state/RegionState.js';
import { worldStateRegistry, type PendingMutation } from '../state/WorldStateRegistry.js';

export interface TravelCorridor {
  fromRegion: string;
  toRegion: string;
  intensity: number; // Fixed-Point
}

export interface StabilityDrift {
  regionId: string;
  drift: number;
  phase: StabilityLevel;
  lastChange: bigint;
}

/**
 * EvolutionSystem - World Flow and Regional Evolution
 */
export class EvolutionSystem {
  private travelHeat: Map<string, TravelCorridor> = new Map();
  private drifts: Map<string, StabilityDrift> = new Map();
  
  private readonly PHASE_CHANGE_COOLDOWN = BigInt(600); // 600 ticks between phase changes
  private readonly STABILITY_THRESHOLD = 750; // Fixed-Point threshold
  
  /**
   * Collect travel data for heatmap (called every tick)
   */
  public collectTravelData(
    playerId: string,
    fromRegion: string,
    toRegion: string
  ): void {
    const key = `${fromRegion}->${toRegion}`;
    const current = this.travelHeat.get(key);
    
    if (current) {
      current.intensity = Math.min(KAPPA, current.intensity + 10);
    } else {
      this.travelHeat.set(key, {
        fromRegion,
        toRegion,
        intensity: 10,
      });
    }
  }
  
  /**
   * Evolve regions (called every 600 ticks)
   */
  public evolveRegions(): void {
    const worldState = worldStateRegistry.getCurrentState();
    
    for (const [regionId, region] of worldState.regions) {
      this.evaluateStability(regionId, region);
    }
  }
  
  /**
   * Evaluate and update stability phase
   */
  private evaluateStability(regionId: string, region: RegionState): void {
    // Calculate drift from various factors
    let drift = 0;
    
    // From threat level
    if (region.threatLevel > this.STABILITY_THRESHOLD) {
      drift += (region.threatLevel - this.STABILITY_THRESHOLD) / 10;
    }
    
    // From control ownership concentration
    let maxOwnership = 0;
    for (const [, share] of region.territoryOwnership) {
      maxOwnership = Math.max(maxOwnership, share);
    }
    if (maxOwnership > KAPPA * 0.8) {
      drift -= 50; // High control = stable
    }
    
    // From travel heat
    const heat = this.getRegionOutboundHeat(regionId);
    if (heat > KAPPA * 0.7) {
      drift += 50; // High traffic = unstable
    }
    
    // Update drift tracking
    const currentDrift = this.drifts.get(regionId);
    if (currentDrift) {
      currentDrift.drift = drift;
    } else {
      this.drifts.set(regionId, {
        regionId,
        drift,
        phase: region.stabilityLevel,
        lastChange: region.lastPhaseChange,
      });
    }
    
    // Check for phase change
    this.attemptPhaseChange(regionId, region, drift);
  }
  
  /**
   * Attempt to change phase with hysteresis cooldown
   */
  private attemptPhaseChange(
    regionId: string,
    region: RegionState,
    drift: number
  ): void {
    const currentTick = worldStateRegistry.getTick();
    const timeSinceChange = currentTick - region.lastPhaseChange;
    
    // Check cooldown
    if (timeSinceChange < this.PHASE_CHANGE_COOLDOWN) {
      return;
    }
    
    // Determine new phase based on drift
    let newPhase: StabilityLevel | undefined;
    
    if (drift > this.STABILITY_THRESHOLD && region.stabilityLevel === StabilityLevel.STABLE) {
      newPhase = StabilityLevel.UNSTABLE;
    } else if (drift > this.STABILITY_THRESHOLD * 2 && region.stabilityLevel === StabilityLevel.UNSTABLE) {
      newPhase = StabilityLevel.CONTESTED;
    } else if (drift < 100 && region.stabilityLevel !== StabilityLevel.STABLE) {
      newPhase = StabilityLevel.STABLE;
    }
    
    // Apply change
    if (newPhase && newPhase !== region.stabilityLevel) {
      worldStateRegistry.queueMutation({
        type: 'SET_REGION_FIELD',
        regionId,
        field: 'stabilityLevel',
        value: newPhase,
      });
      
      worldStateRegistry.queueMutation({
        type: 'SET_REGION_FIELD',
        regionId,
        field: 'lastPhaseChange',
        value: currentTick,
      });
    }
  }
  
  /**
   * Get outbound travel heat for region
   */
  private getRegionOutboundHeat(regionId: string): number {
    let total = 0;
    for (const [, corridor] of this.travelHeat) {
      if (corridor.fromRegion === regionId) {
        total += corridor.intensity;
      }
    }
    return total;
  }
  
  public getTravelHeat(): TravelCorridor[] {
    return [...this.travelHeat.values()];
  }
}