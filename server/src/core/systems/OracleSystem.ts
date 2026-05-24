/**
 * @file server/src/core/systems/OracleSystem.ts
 * @description STEP 5: Oracle System - Pressure & Causality management.
 */

import { worldStateRegistry, type PendingMutation } from '../state/WorldStateRegistry.js';
import { type OraclePressureTag, type RegionState } from '../state/RegionState.js';

/**
 * Oracle pattern detection result
 */
export interface PatternResult {
  regionId: string;
  pressureTag: OraclePressureTag;
  intensity: number; // Fixed-Point
  decay: number; // ticks until decay
}

/**
 * OracleSystem - Pattern detection and pressure generation
 */
export class OracleSystem {
  private patterns: PatternResult[] = [];
  
  /**
   * Detect patterns and generate pressure tags
   */
  public async detectPatterns(): Promise<void> {
    const worldState = worldStateRegistry.getCurrentState();
    
    // Sort region IDs for absolute deterministic pattern detection
    const sortedRegionIds = Array.from(worldState.regions.keys()).sort();
    for (const regionId of sortedRegionIds) {
      const region = worldState.regions.get(regionId)!;
      // Check for DEPLETED_RESOURCES
      this.checkResourceDepletion(regionId, region);
      
      // Check for HIGH_CONFLICT
      this.checkConflictLevel(regionId, region);
      
      // Check for ECONOMIC_BOOM
      this.checkTradeFlow(regionId, region);
    }
  }
  
  /**
   * Check if resources are depleted
   */
  private checkResourceDepletion(regionId: string, region: RegionState): void {
    let totalSaturation = 0;
    // Sort resource types for absolute deterministic saturation calculation
    const sortedResourceTypes = Array.from(region.resourceSaturation.keys()).sort();
    for (const resourceType of sortedResourceTypes) {
      const value = region.resourceSaturation.get(resourceType)!;
      totalSaturation += value;
    }
    
    const avgSaturation = totalSaturation / Math.max(1, region.resourceSaturation.size);
    
    // Threshold: < 100 (0.1) = depleted
    if (avgSaturation < 100 && !region.oraclePressureTags.includes('DEPLETED_RESOURCES' as any)) {
      this.queuePressure(regionId, 'DEPLETED_RESOURCES', 1000, 600);
    }
  }
  
  /**
   * Check conflict level
   */
  private checkConflictLevel(regionId: string, region: RegionState): void {
    if (region.threatLevel > 750) { // > 0.75
      if (!region.oraclePressureTags.includes('HIGH_CONFLICT' as any)) {
        this.queuePressure(regionId, 'HIGH_CONFLICT', region.threatLevel, 300);
      }
    }
  }
  
  /**
   * Check trade flow boom
   */
  private checkTradeFlow(regionId: string, region: RegionState): void {
    if (region.tradeFlowIntensity > 900) {
      if (!region.oraclePressureTags.includes('ECONOMIC_BOOM' as any)) {
        this.queuePressure(regionId, 'ECONOMIC_BOOM', region.tradeFlowIntensity, 200);
      }
    }
  }
  
  /**
   * Queue pressure mutation
   */
  private queuePressure(regionId: string, tag: string, intensity: number, decayTicks: number): void {
    worldStateRegistry.queueMutation({
      type: 'ADD_ORACLE_PRESSURE',
      regionId,
      pressureTag: tag,
    });
    
    this.patterns.push({
      regionId,
      pressureTag: tag as any,
      intensity,
      decay: decayTicks,
    });
  }
  
  /**
   * Apply deterministic decay
   */
  public applyDecay(): void {
    const toRemove: PatternResult[] = [];
    
    for (const pattern of this.patterns) {
      pattern.decay--;
      if (pattern.decay <= 0) {
        worldStateRegistry.queueMutation({
          type: 'REMOVE_ORACLE_PRESSURE',
          regionId: pattern.regionId,
          pressureTag: pattern.pressureTag,
        });
        toRemove.push(pattern);
      }
    }
    
    for (const p of toRemove) {
      this.patterns = this.patterns.filter(x => x !== p);
    }
  }
  
  public getPatterns(): PatternResult[] {
    return [...this.patterns];
  }
}