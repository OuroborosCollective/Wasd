/**
 * @file server/src/core/systems/NPCSimulation.ts
 * @description STEP 6: NPC Simulation with Utility-based AI.
 */

import { type SimDensityMap } from './ObserverEngine.js';
import { type OraclePressureTag } from '../state/RegionState.js';

export interface NPCIdentity {
  npcId: string;
  name: string;
  faction: string;
}

export interface NeedModel {
  safety: number;     // 0-1000
  resources: number;  // 0-1000
}

export interface GoalStackItem {
  goalId: string;
  priority: number;
  targetRegion?: string;
}

export interface NPCState {
  identity: NPCIdentity;
  needs: NeedModel;
  goals: GoalStackItem[];
  stressLevel: number;
  position: { x: number; y: number; z: number };
}

export interface NPCUpdateResult {
  npcId: string;
  needs: NeedModel;
  stressDelta: number;
}

/**
 * NPCSimulation - Utility-based AI for autonomous actors
 */
export class NPCSimulation {
  private npcs: Map<string, NPCState> = new Map();
  
  /**
   * Update NPCs based on density map
   */
  public async update(densityMap: SimDensityMap): Promise<NPCUpdateResult[]> {
    const results: NPCUpdateResult[] = [];
    
    for (const [npcId, npc] of this.npcs) {
      // Check density tier for NPC position
      const tier = densityMap.chunks.get(this.getChunkForPosition(npc.position))?.densityTier ?? 3;
      
      // Tier 2 (Abstract): only every 10th tick
      if (tier === 2) {
        continue; // Skip this tick
      }
      
      // Calculate needs based on region state
      const needs = this.calculateNeeds(npc);
      const stressDelta = this.calculateStress(npc, needs);
      
      npc.needs = needs;
      npc.stressLevel = Math.max(0, Math.min(1000, npc.stressLevel + stressDelta));
      
      results.push({ npcId, needs, stressDelta });
    }
    
    return results;
  }
  
  /**
   * Calculate needs (safety, resources)
   */
  private calculateNeeds(npc: NPCState): NeedModel {
    // Simplified: based on stress level
    return {
      safety: Math.max(0, 500 - npc.stressLevel),
      resources: 500,
    };
  }
  
  /**
   * Calculate stress delta
   */
  private calculateStress(npc: NPCState, needs: NeedModel): number {
    let stress = 0;
    if (needs.safety < 300) stress += 50;
    if (needs.resources < 200) stress += 30;
    return stress;
  }
  
  /**
   * Get chunk for position (simplified)
   */
  private getChunkForPosition(pos: {x: number; y: number; z: number}): string {
    return `${Math.floor(pos.x / 16)}_${Math.floor(pos.z / 16)}`;
  }
  
  /**
   * Register NPC
   */
  public registerNPC(state: NPCState): void {
    this.npcs.set(state.identity.npcId, state);
  }
  
  public getNPC(id: string): NPCState | undefined {
    return this.npcs.get(id);
  }
}