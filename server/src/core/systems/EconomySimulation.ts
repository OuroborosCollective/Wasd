/**
 * @file server/src/core/systems/EconomySimulation.ts
 * @description STEP 7: Economy & Territory System.
 */

import { worldStateRegistry, type PendingMutation } from '../state/WorldStateRegistry.js';
import { type RegionState, KAPPA } from '../state/RegionState.js';

/**
 * Price information
 */
export interface PriceInfo {
  resourceType: string;
  price: number; // Fixed-Point
  lastUpdate: bigint;
}

/**
 * EconomySimulation - Price balancing and territory management
 */
export class EconomySimulation {
  private prices: Map<string, PriceInfo> = new Map();
  
  /**
   * Update economy (called every tick)
   */
  public update(): void {
    const worldState = worldStateRegistry.getCurrentState();
    
    for (const [regionId, region] of worldState.regions) {
      this.updatePrices(region);
      this.updateTerritory(region);
    }
  }
  
  /**
   * Update prices based on saturation and trade flow
   */
  private updatePrices(region: RegionState): void {
    for (const [resourceType, saturation] of region.resourceSaturation) {
      // Base price: inversely proportional to saturation
      let price = KAPPA - saturation;
      
      // Adjust by trade flow intensity
      if (region.tradeFlowIntensity > 500) {
        price = Math.floor(price * 1.1); // 10% boost
      }
      
      this.prices.set(resourceType, {
        resourceType,
        price,
        lastUpdate: worldStateRegistry.getTick(),
      });
    }
  }
  
  /**
   * Update territory energy and infrastructure
   */
  private updateTerritory(region: RegionState): void {
    // Decay matrix energy
    let newEnergy = region.matrixEnergyBalance - 1;
    
    // If energy depleted
    if (newEnergy <= 0) {
      newEnergy = 0;
      
      // Reduce infrastructure
      const newInfra = Math.max(0, region.infrastructureLevel - 50);
      if (newInfra !== region.infrastructureLevel) {
        worldStateRegistry.queueMutation({
          type: 'SET_REGION_FIELD',
          regionId: region.regionId,
          field: 'infrastructureLevel',
          value: newInfra,
        });
        
        // Increase visual corruption
        const newCorruption = Math.min(KAPPA, region.visualCorruptionState + 100);
        worldStateRegistry.queueMutation({
          type: 'SET_REGION_FIELD',
          regionId: region.regionId,
          field: 'visualCorruptionState',
          value: newCorruption,
        });
      }
    }
    
    // Update energy balance
    worldStateRegistry.queueMutation({
      type: 'SET_REGION_FIELD',
      regionId: region.regionId,
      field: 'matrixEnergyBalance',
      value: newEnergy,
    });
  }
  
  /**
   * Get current price
   */
  public getPrice(resourceType: string): number {
    return this.prices.get(resourceType)?.price ?? KAPPA;
  }
}