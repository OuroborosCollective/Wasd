/**
 * @file server/src/core/state/WorldStateRegistry.ts
 * @description Single Source of Truth (SSoT) for deterministic world state.
 * Implements Double-Buffering to prevent race conditions during 10-Hz ticks.
 */

import { 
  RegionState, 
  WorldState, 
  createDefaultRegionState,
  createDefaultWorldState,
  type IRegionState,
  type IWorldState,
} from './RegionState.js';

/**
 * WorldStateRegistry - SSoT with Double-Buffering
 * 
 * Uses two buffers:
 * - currentState: Read-only snapshot for validation
 * - pendingMutations: Write buffer for next tick
 * 
 * This guarantees deterministic behavior across all ticks.
 */
export class WorldStateRegistry {
  private currentState: WorldState;
  private pendingMutations: PendingMutation[] = [];
  
  /**
   * Pending mutation to be applied on next commit
   */
  public getCurrentState(): Readonly<WorldState> {
    return this.currentState;
  }
  
  /**
   * Get a region's state (read-only)
   */
  public getRegion(regionId: string): Readonly<IRegionState> | null {
    return this.currentState.regions.get(regionId) ?? null;
  }
  
  /**
   * Get current tick number
   */
  public getTick(): bigint {
    return this.currentState.globalTick;
  }
  
  /**
   * Queue a mutation for next tick
   */
  public queueMutation(mutation: PendingMutation): void {
    this.pendingMutations.push(mutation);
  }
  
  /**
   * Apply all pending mutations atomically
   * Must only be called by Arelorian Tick Orchestrator (ATO)
   */
  public commitMutations(): void {
    // Start new world state from current (copy)
    const newState: WorldState = {
      regions: new Map(this.currentState.regions),
      globalTick: this.currentState.globalTick + BigInt(1),
      lastSyncTimestamp: Date.now(), // @are-determinism-allow
    };
    
    // Apply each mutation
    for (const mutation of this.pendingMutations) {
      this.applyMutation(newState, mutation);
    }
    
    // Replace current state atomically
    this.currentState = newState;
    this.pendingMutations = [];
  }
  
  /**
   * Apply a single mutation to a world state
   */
  private applyMutation(state: WorldState, mutation: PendingMutation): void {
    switch (mutation.type) {
      case 'UPDATE_REGION':
        state.regions.set(mutation.regionId, mutation.state);
        break;
        
      case 'SET_REGION_FIELD': {
        const region = state.regions.get(mutation.regionId);
        if (region) {
          (region as any)[mutation.field] = mutation.value;
        }
        break;
      }
      
      case 'DELETE_REGION':
        state.regions.delete(mutation.regionId);
        break;
        
      case 'ADD_ORACLE_PRESSURE':
        this.addOraclePressure(state, mutation.regionId, mutation.pressureTag);
        break;
        
      case 'REMOVE_ORACLE_PRESSURE':
        this.removeOraclePressure(state, mutation.regionId, mutation.pressureTag);
        break;
    }
  }
  
  /**
   * Add Oracle pressure tag to region
   */
  private addOraclePressure(state: WorldState, regionId: string, tag: string): void {
    const region = state.regions.get(regionId);
    if (region && !region.oraclePressureTags.includes(tag as any)) {
      region.oraclePressureTags.push(tag as any);
    }
  }
  
  /**
   * Remove Oracle pressure tag from region
   */
  private removeOraclePressure(state: WorldState, regionId: string, tag: string): void {
    const region = state.regions.get(regionId);
    if (region) {
      region.oraclePressureTags = region.oraclePressureTags.filter(
        (t: any) => t !== tag
      ) as any[];
    }
  }
  
  /**
   * Get pending mutations count (for monitoring)
   */
  public getPendingCount(): number {
    return this.pendingMutations.length;
  }
  
  /**
   * Constructor - initializes with default state
   */
  constructor() {
    this.currentState = createDefaultWorldState();
  }
}

/**
 * Pending mutation types
 */
export type PendingMutation =
  | {
      type: 'UPDATE_REGION';
      regionId: string;
      state: IRegionState;
    }
  | {
      type: 'SET_REGION_FIELD';
      regionId: string;
      field: string;
      value: any;
    }
  | {
      type: 'DELETE_REGION';
      regionId: string;
    }
  | {
      type: 'ADD_ORACLE_PRESSURE';
      regionId: string;
      pressureTag: string;
    }
  | {
      type: 'REMOVE_ORACLE_PRESSURE';
      regionId: string;
      pressureTag: string;
    };

/**
 * Singleton instance
 */
export const worldStateRegistry = new WorldStateRegistry();