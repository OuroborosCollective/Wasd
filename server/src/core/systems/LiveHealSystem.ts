/**
 * @file server/src/core/systems/LiveHealSystem.ts
 * @description Live Healing System - Restoration counterpart to decay.
 * Allows players to restore regions from collapse.
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
 * Convert from Fixed-Point
 */
function fromFP(fp: number): number {
  return fp / FP_SCALE;
}

/**
 * Restoration milestone event
 */
export interface RestorationMilestoneEvent {
  regionId: string;
  milestone: 'ENERGY_RESTORED' | 'CORRUPTION_REDUCED' | 'SERVICE_RESTORED' | 'STABILITY_IMPROVED';
  previousValue: number;
  newValue: number;
  tick: bigint;
}

/**
 * Service reactivation threshold
 */
const SERVICE_THRESHOLDS = {
  SPAWN_QUEST: 0.2, // 20% stability
  ECONOMY_TRADE: 0.5, // 50% stability
};

/**
 * Visual corruption reduction rates
 */
const CORRUPTION_RESISTANCE_CURVE = [
  { corruption: 0.9, resistance: 1.0 },   // 90%+ corruption = 100% resistance
  { corruption: 0.7, resistance: 0.8 },   // 70%+ = 80%
  { corruption: 0.5, resistance: 0.5 },  // 50%+ = 50%
  { corruption: 0.3, resistance: 0.3 },  // 30%+ = 30%
  { corruption: 0.0, resistance: 0.1 },   // <30% = 10%
];

/**
 * LiveHealSystem - Restoration and healing mechanics
 */
export class LiveHealSystem {
  private pendingMilestones: RestorationMilestoneEvent[] = [];
  private healingStreak: Map<string, number> = new Map(); // regionId -> consecutive healing ticks
  
  /**
   * 1. Energy Injection & Conversion
   * Inject matrix energy into a region
   */
  public injectMatrixEnergy(
    regionId: string,
    amount: number, // Fixed-Point
    mastery: number = 0 // Player mastery bonus (0-1000)
  ): { success: boolean; actualHeal: number } {
    const worldState = worldStateRegistry.getCurrentState();
    const region = worldState.regions.get(regionId);
    
    if (!region) {
      return { success: false, actualHeal: 0 };
    }
    
    // Calculate heal power: Heal_Power = amount * (1 + mastery / 1000)
    const masteryBonus = Math.floor(amount * mastery / FP_SCALE);
    const healPower = amount + masteryBonus;
    
    // Calculate actual heal considering corruption resistance
    const corruptionResistance = this.getCorruptionResistance(region.visualCorruptionState);
    const actualHeal = Math.floor(healPower * (1 - corruptionResistance));
    
    // Apply healing
    const previousEnergy = region.matrixEnergyBalance;
    const newEnergy = Math.min(
      toFP(100), // Max 100 energy
      region.matrixEnergyBalance + actualHeal
    );
    
    // Queue mutation
    worldStateRegistry.queueMutation({
      type: 'SET_REGION_FIELD',
      regionId,
      field: 'matrixEnergyBalance',
      value: newEnergy,
    });
    
    // Record transaction in ledger
    this.recordEnergyFlow(regionId, actualHeal, 'HEALING');
    
    // Track healing streak
    this.updateHealingStreak(regionId, actualHeal > 0);
    
    // Check for milestone
    if (newEnergy > previousEnergy) {
      this.queueMilestone({
        regionId,
        milestone: 'ENERGY_RESTORED',
        previousValue: previousEnergy,
        newValue: newEnergy,
        tick: worldStateRegistry.getTick(),
      });
    }
    
    return { success: true, actualHeal };
  }

  /**
   * 2. Corruption Reversal
   * Reduce visual corruption based on healing
   */
  public reduceCorruption(
    regionId: string,
    healAmount: number
  ): number {
    const worldState = worldStateRegistry.getCurrentState();
    const region = worldState.regions.get(regionId);
    
    if (!region) return 0;
    
    // Get current resistance
    const resistance = this.getCorruptionResistance(region.visualCorruptionState);
    
    // Calculate reduction: higher corruption = more energy needed
    // Base reduction per energy: 0.001 (0.1%)
    const baseReduction = toFP(0.001);
    const actualReduction = Math.floor(baseReduction * healAmount * (1 - resistance));
    
    // Apply reduction (corruption goes down)
    const newCorruption = Math.max(0, region.visualCorruptionState - actualReduction);
    
    worldStateRegistry.queueMutation({
      type: 'SET_REGION_FIELD',
      regionId,
      field: 'visualCorruptionState',
      value: newCorruption,
    });
    
    // Check milestone
    if (newCorruption < region.visualCorruptionState) {
      this.queueMilestone({
        regionId,
        milestone: 'CORRUPTION_REDUCED',
        previousValue: region.visualCorruptionState,
        newValue: newCorruption,
        tick: worldStateRegistry.getTick(),
      });
    }
    
    return actualReduction;
  }

  /**
   * Get corruption resistance curve
   */
  private getCorruptionResistance(corruption: number): number {
    for (const tier of CORRUPTION_RESISTANCE_CURVE) {
      if (corruption >= toFP(tier.corruption)) {
        return toFP(tier.resistance);
      }
    }
    return toFP(0.1); // Default minimum resistance
  }

  /**
   * 3. Service Reactivation (Phased Restart)
   * Check and reactivate services based on stability
   */
  public checkServiceReactivation(regionId: string): string[] {
    const worldState = worldStateRegistry.getCurrentState();
    const region = worldState.regions.get(regionId);
    
    if (!region) return [];
    
    const reactivatedServices: string[] = [];
    const currentTick = worldStateRegistry.getTick();
    
    // Calculate stability from various factors
    const stability = this.calculateStability(region);
    
    // Check for service reactivation thresholds
    if (stability >= SERVICE_THRESHOLDS.SPAWN_QUEST) {
      // Reactivate SPAWN and QUEST
      if (!this.isServiceActive(region, 'SPAWN')) {
        reactivatedServices.push('SPAWN');
      }
      if (!this.isServiceActive(region, 'QUEST')) {
        reactivatedServices.push('QUEST');
      }
      
      this.queueMilestone({
        regionId,
        milestone: 'SERVICE_RESTORED',
        previousValue: 0,
        newValue: stability,
        tick: currentTick,
      });
    }
    
    if (stability >= SERVICE_THRESHOLDS.ECONOMY_TRADE) {
      // Reactivate ECONOMY and TRADE
      if (!this.isServiceActive(region, 'ECONOMY')) {
        reactivatedServices.push('ECONOMY');
      }
      if (!this.isServiceActive(region, 'TRADE')) {
        reactivatedServices.push('TRADE');
      }
    }
    
    // Apply reactivation
    if (reactivatedServices.length > 0) {
      const currentServices = (region as any).activeServices || [];
      const newServices = [...currentServices, ...reactivatedServices];
      
      worldStateRegistry.queueMutation({
        type: 'SET_REGION_FIELD',
        regionId,
        field: 'activeServices',
        value: newServices,
      });
    }
    
    return reactivatedServices;
  }

  /**
   * Calculate stability from region state
   */
  private calculateStability(region: RegionState): number {
    let stability = FP_SCALE; // Start at 100%
    
    // Energy contributes 40%
    const energyFactor = region.matrixEnergyBalance / toFP(100);
    stability -= (FP_SCALE - energyFactor) * 0.4;
    
    // Infrastructure contributes 30%
    const infraFactor = region.infrastructureLevel / toFP(1);
    stability -= (FP_SCALE - infraFactor) * 0.3;
    
    // Low threat contributes 20%
    const threatFactor = (FP_SCALE - region.threatLevel) / FP_SCALE;
    stability += threatFactor * 0.2;
    
    // Trade flow contributes 10%
    const tradeFactor = region.tradeFlowIntensity / FP_SCALE;
    stability += tradeFactor * 0.1;
    
    return Math.max(0, Math.min(FP_SCALE, stability));
  }

  /**
   * Check if service is active
   */
  private isServiceActive(region: RegionState, service: string): boolean {
    const services = (region as any).activeServices as string[] | undefined;
    return services?.includes(service) ?? false;
  }

  /**
   * 4. Evolution-Hysteresis (Reverse)
   * Trigger phase change back when healing is stable
   */
  public checkPhaseRecovery(regionId: string): StabilityLevel | null {
    const worldState = worldStateRegistry.getCurrentState();
    const region = worldState.regions.get(regionId);
    
    if (!region) return null;
    
    // Check healing streak
    const streak = this.healingStreak.get(regionId) || 0;
    const requiredStreak = 1000; // 1000 ticks of healing
    
    if (streak < requiredStreak) return null;
    
    // Calculate current stability
    const stability = this.calculateStability(region);
    
    // Determine target phase based on current phase
    let targetPhase: StabilityLevel | null = null;
    
    if (region.stabilityLevel === StabilityLevel.TOTAL_COLLAPSE && stability >= toFP(0.3)) {
      targetPhase = StabilityLevel.PARTIAL_COLLAPSE;
    } else if (region.stabilityLevel === StabilityLevel.PARTIAL_COLLAPSE && stability >= toFP(0.4)) {
      targetPhase = StabilityLevel.CRITICAL;
    } else if (region.stabilityLevel === StabilityLevel.CRITICAL && stability >= toFP(0.5)) {
      targetPhase = StabilityLevel.CONTESTED;
    } else if (region.stabilityLevel === StabilityLevel.CONTESTED && stability >= toFP(0.7)) {
      targetPhase = StabilityLevel.UNSTABLE;
    } else if (region.stabilityLevel === StabilityLevel.UNSTABLE && stability >= toFP(0.9)) {
      targetPhase = StabilityLevel.STABLE;
    }
    
    if (targetPhase) {
      // Apply phase change
      worldStateRegistry.queueMutation({
        type: 'SET_REGION_FIELD',
        regionId,
        field: 'stabilityLevel',
        value: targetPhase,
      });
      
      // Update corruption based on new phase
      const corruptionMap: Record<StabilityLevel, number> = {
        [StabilityLevel.STABLE]: toFP(0),
        [StabilityLevel.UNSTABLE]: toFP(0.1),
        [StabilityLevel.CONTESTED]: toFP(0.2),
        [StabilityLevel.CRITICAL]: toFP(0.3),
        [StabilityLevel.PARTIAL_COLLAPSE]: toFP(0.4),
        [StabilityLevel.TOTAL_COLLAPSE]: toFP(0.5),
      };
      
      const newCorruption = Math.min(
        region.visualCorruptionState,
        corruptionMap[targetPhase] || toFP(0.1)
      );
      
      worldStateRegistry.queueMutation({
        type: 'SET_REGION_FIELD',
        regionId,
        field: 'visualCorruptionState',
        value: newCorruption,
      });
      
      this.queueMilestone({
        regionId,
        milestone: 'STABILITY_IMPROVED',
        previousValue: region.stabilityLevel as any,
        newValue: targetPhase as any,
        tick: worldStateRegistry.getTick(),
      });
    }
    
    return targetPhase;
  }

  /**
   * Update healing streak
   */
  private updateHealingStreak(regionId: string, healing: boolean): void {
    if (healing) {
      const current = this.healingStreak.get(regionId) || 0;
      this.healingStreak.set(regionId, current + 1);
    } else {
      // Reset streak if no healing
      this.healingStreak.set(regionId, 0);
    }
  }

  /**
   * Record energy flow in ledger
   */
  private recordEnergyFlow(regionId: string, amount: number, type: string): void {
    // This would integrate with EconomySimulation's ledger
    // Simplified for now
  }

  /**
   * Queue milestone event
   */
  private queueMilestone(event: RestorationMilestoneEvent): void {
    this.pendingMilestones.push(event);
  }

  /**
   * Get pending milestones
   */
  public getMilestones(): RestorationMilestoneEvent[] {
    return [...this.pendingMilestones];
  }

  /**
   * Clear processed milestones
   */
  public clearMilestones(): void {
    this.pendingMilestones = [];
  }

  /**
   * Get healing streak for region
   */
  public getHealingStreak(regionId: string): number {
    return this.healingStreak.get(regionId) || 0;
  }

  /**
   * Full healing cycle (called when player performs healing action)
   */
  public performHealingCycle(
    regionId: string,
    energyAmount: number,
    mastery: number = 0
  ): { energyRestored: number; corruptionReduced: number; servicesReactivated: string[]; phaseRecovered: StabilityLevel | null } {
    // Step 1: Inject energy
    const { actualHeal } = this.injectMatrixEnergy(regionId, energyAmount, mastery);
    
    // Step 2: Reduce corruption
    const corruptionReduced = this.reduceCorruption(regionId, actualHeal);
    
    // Step 3: Check service reactivation
    const servicesReactivated = this.checkServiceReactivation(regionId);
    
    // Step 4: Check phase recovery
    const phaseRecovered = this.checkPhaseRecovery(regionId);
    
    return {
      energyRestored: actualHeal,
      corruptionReduced,
      servicesReactivated,
      phaseRecovered,
    };
  }
}

/**
 * Singleton
 */
export const liveHealSystem = new LiveHealSystem();