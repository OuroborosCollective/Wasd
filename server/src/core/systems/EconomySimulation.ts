/**
 * @file server/src/core/systems/EconomySimulation.ts
 * @description STEP 7: Economy & Territory System.
 * Complete implementation with Matrix Energy Ledger and PriceBalancer.
 */

import { worldStateRegistry, type PendingMutation } from '../state/WorldStateRegistry.js';
import { type RegionState, KAPPA, OraclePressureTag } from '../state/RegionState.js';

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
 * Convert from Fixed-Point
 */
function fromFP(fp: number): number {
  return fp / FP_SCALE;
}

/**
 * Resource base values (Fixed-Point)
 */
const RESOURCE_BASE_VALUES: Record<string, number> = {
  'wood': toFP(10),
  'stone': toFP(15),
  'ore': toFP(25),
  'herb': toFP(20),
  'crystal': toFP(50),
};

/**
 * Price information
 */
export interface PriceInfo {
  resourceType: string;
  price: number; // Fixed-Point
  lastUpdate: bigint;
}

/**
 * Matrix Energy Transaction
 */
export interface EnergyTransaction {
  fromEntity: string;
  toEntity: string;
  amount: number; // Fixed-Point
  type: 'EXTRACTION' | 'TRANSFER' | 'MAINTENANCE' | 'TRADE' | 'ORACLE_BURN';
  tick: bigint;
}

/**
 * Trade event for NPC coupling
 */
export interface TradeEvent {
  sellerId: string;
  buyerId: string;
  resourceType: string;
  amount: number;
  price: number;
  regionId: string;
}

/**
 * Maintenance deficit event
 */
export interface MaintenanceDeficitEvent {
  regionId: string;
  requiredEnergy: number;
  availableEnergy: number;
  deficit: number;
  tick: bigint;
}

/**
 * EconomySimulation - Price balancing and territory management
 */
export class EconomySimulation {
  private prices: Map<string, PriceInfo> = new Map();
  private energyLedger: EnergyTransaction[] = [];
  private pendingTradeEvents: TradeEvent[] = [];
  private pendingMaintenanceDeficits: MaintenanceDeficitEvent[] = [];
  private oraclePool: number = toFP(10000); // Oracle pool starts with 10000 energy

  /**
   * Update economy (called every tick)
   */
  public update(): void {
    const worldState = worldStateRegistry.getCurrentState();
    const tick = worldStateRegistry.getTick();

    for (const [regionId, region] of worldState.regions) {
      // 1. Process economy
      this.processExtractions(region);
      this.updatePrices(region);
      
      // 2. Territory maintenance
      this.updateTerritory(region);
    }

    // 3. Process NPC trade events
    this.processTradeEvents();
  }

  /**
   * Process resource extractions
   */
  private processExtractions(region: RegionState): void {
    // Each extraction reduces regional energy
    for (const [resourceType, saturation] of region.resourceSaturation) {
      // If resources are being extracted (saturation dropping)
      if (saturation < KAPPA) {
        // Energy cost: proportional to extraction amount
        const extractionCost = Math.floor((KAPPA - saturation) / 10);
        
        // Deduct from region energy
        const newEnergy = Math.max(0, region.matrixEnergyBalance - extractionCost);
        
        worldStateRegistry.queueMutation({
          type: 'SET_REGION_FIELD',
          regionId: region.regionId,
          field: 'matrixEnergyBalance',
          value: newEnergy,
        });

        // Record in ledger: Region -> Oracle Pool
        this.recordTransaction({
          fromEntity: region.regionId,
          toEntity: 'ORACLE_POOL',
          amount: extractionCost,
          type: 'EXTRACTION',
          tick: worldStateRegistry.getTick(),
        });

        // Burn to oracle pool
        this.oraclePool = Math.min(toFP(100000), this.oraclePool + extractionCost);
      }
    }
  }

  /**
   * Update prices based on saturation and trade flow (Deterministic)
   * Formula: Price = Base_Value * (1 + (1000 - Current_Saturation) / 500) * (1 + Conflict_Pressure / 1000)
   */
  private updatePrices(region: RegionState): void {
    const tick = worldStateRegistry.getTick();

    for (const [resourceType, saturation] of region.resourceSaturation) {
      // Base value from table
      const baseValue = RESOURCE_BASE_VALUES[resourceType] ?? KAPPA;

      // Factor 1: (1000 - saturation) / 500 = 2 - 2*saturation/1000
      // In Fixed-Point: (FP_SCALE - saturation) * 2 = 2*FP_SCALE - 2*saturation
      const scarcityFactor = FP_SCALE * 2 - Math.floor(2 * saturation / FP_SCALE * 1000);

      // Factor 2: (1 + Conflict_Pressure / 1000)
      // Check for HIGH_CONFLICT pressure
      const hasConflict = region.oraclePressureTags.includes('HIGH_CONFLICT' as OraclePressureTag);
      const conflictPressure = hasConflict ? region.threatLevel : 0;
      const conflictFactor = FP_SCALE + conflictPressure;

      // Full formula in Fixed-Point
      // Price = baseValue * (scarcityFactor / FP_SCALE) * (conflictFactor / FP_SCALE)
      let price = Math.floor(
        (baseValue * scarcityFactor * conflictFactor) / (FP_SCALE * FP_SCALE)
      );

      // Clamp to reasonable range (10% - 500% of base)
      const minPrice = Math.floor(baseValue * 0.1);
      const maxPrice = Math.floor(baseValue * 5);
      price = Math.max(minPrice, Math.min(maxPrice, price));

      this.prices.set(resourceType, {
        resourceType,
        price,
        lastUpdate: tick,
      });
    }
  }

  /**
   * Update territory energy and infrastructure
   */
  private updateTerritory(region: RegionState): void {
    const tick = worldStateRegistry.getTick();
    const infraLevel = region.infrastructureLevel;

    if (infraLevel <= 0) return; // No settlement

    // Energy consumption: infrastructure_level / 100 per tick
    // For level 500: consumes 5 energy per tick
    const consumption = Math.floor(infraLevel / 100) + 1;
    let newEnergy = region.matrixEnergyBalance - consumption;

    // Check for maintenance deficit
    if (newEnergy < 0) {
      const deficit = -newEnergy;
      newEnergy = 0;

      // Queue maintenance deficit event for Oracle
      this.pendingMaintenanceDeficits.push({
        regionId: region.regionId,
        requiredEnergy: consumption,
        availableEnergy: 0,
        deficit,
        tick,
      });

      // Queue: Set MAINTENANCE_DEFICIT oracle pressure
      worldStateRegistry.queueMutation({
        type: 'ADD_ORACLE_PRESSURE',
        regionId: region.regionId,
        pressureTag: 'MAINTENANCE_DEFICIT',
      });

      // Reduce infrastructure due to deficit
      const newInfra = Math.max(0, infraLevel - 50);
      if (newInfra !== infraLevel) {
        worldStateRegistry.queueMutation({
          type: 'SET_REGION_FIELD',
          regionId: region.regionId,
          field: 'infrastructureLevel',
          value: newInfra,
        });

        // Increase corruption
        const newCorruption = Math.min(KAPPA, region.visualCorruptionState + toFP(0.1));
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

    // Record consumption
    this.recordTransaction({
      fromEntity: region.regionId,
      toEntity: 'ORACLE_POOL',
      amount: consumption,
      type: 'MAINTENANCE',
      tick,
    });
  }

  /**
   * Process NPC trade events - coupling with Merchant NPCs
   */
  private processTradeEvents(): void {
    for (const event of this.pendingTradeEvents) {
      // Increase trade flow intensity in region
      const worldState = worldStateRegistry.getCurrentState();
      const region = worldState.regions.get(event.regionId);

      if (region) {
        const currentFlow = region.tradeFlowIntensity;
        const newFlow = Math.min(KAPPA, currentFlow + toFP(0.05)); // +5% per trade

        worldStateRegistry.queueMutation({
          type: 'SET_REGION_FIELD',
          regionId: event.regionId,
          field: 'tradeFlowIntensity',
          value: newFlow,
        });
      }
    }

    // Clear processed events
    this.pendingTradeEvents = [];
  }

  /**
   * Record energy transaction in ledger
   */
  private recordTransaction(tx: EnergyTransaction): void {
    this.energyLedger.push(tx);
    
    // Keep ledger bounded (last 10000 transactions)
    if (this.energyLedger.length > 10000) {
      this.energyLedger.shift();
    }
  }

  /**
   * Register trade event (called by NPC system)
   */
  public registerTradeEvent(event: TradeEvent): void {
    this.pendingTradeEvents.push(event);
  }

  /**
   * Get current price for resource
   */
  public getPrice(resourceType: string): number {
    return this.prices.get(resourceType)?.price ?? RESOURCE_BASE_VALUES[resourceType] ?? KAPPA;
  }

  /**
   * Get Oracle pool balance
   */
  public getOraclePoolBalance(): number {
    return this.oraclePool;
  }

  /**
   * Get energy ledger
   */
  public getEnergyLedger(): EnergyTransaction[] {
    return [...this.energyLedger];
  }

  /**
   * Get pending maintenance deficits
   */
  public getMaintenanceDeficits(): MaintenanceDeficitEvent[] {
    return [...this.pendingMaintenanceDeficits];
  }

  /**
   * Get net energy flow for region
   */
  public getRegionEnergyFlow(regionId: string, tick: bigint): number {
    let flow = 0;
    for (const tx of this.energyLedger) {
      if (tx.tick === tick) {
        if (tx.fromEntity === regionId) flow -= tx.amount;
        if (tx.toEntity === regionId) flow += tx.amount;
      }
    }
    return flow;
  }

  /**
   * Calculate total region energy
   */
  public calculateTotalRegionEnergy(): number {
    const worldState = worldStateRegistry.getCurrentState();
    let total = 0;
    for (const [, region] of worldState.regions) {
      total += region.matrixEnergyBalance;
    }
    return total;
  }

  /**
   * Calculate total system energy (regions + oracle pool)
   */
  public calculateTotalSystemEnergy(): number {
    return this.calculateTotalRegionEnergy() + this.oraclePool;
  }
}