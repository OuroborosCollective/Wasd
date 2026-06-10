/**
 * EconomyTickSystem - Economy management TickSystem
 * 
 * Phase 6 of the Core Reality Alignment initiative.
 * 
 * EconomySystem is primarily transaction-based (addGold, removeGold, adjustPrice)
 * but may need periodic tick processing for:
 * - Market price recalculation
 * - Supply/demand tracking
 * - Tax collection
 */

import { TickSystem, TickSystemPriority, type TickSystemContext } from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';
import type { EconomySystem } from '../modules/economy/EconomySystem.js';

/**
 * EconomyTickSystem implements TickSystem for economy processing.
 */
export class EconomyTickSystem implements TickSystem {
  readonly name = 'economy';
  readonly priority = TickSystemPriority.GAMEPLAY;
  enabled = true;
  
  private economySystem: EconomySystem;
  private priceRecalcInterval = 100; // Recalculate prices every 100 ticks
  
  constructor(economySystem: EconomySystem) {
    this.economySystem = economySystem;
  }
  
  tick(context: TickSystemContext): void {
    // Economy processing is mostly transaction-based
    // Periodic tasks include price recalculation and market updates
    
    // Price recalculation happens on interval
    if (context.tickCount % this.priceRecalcInterval === 0) {
      this.processMarketUpdates(context.tickCount);
    }
  }
  
  /**
   * Process periodic market updates.
   */
  private processMarketUpdates(tickCount: number): void {
    // Market updates could include:
    // - Seasonal price adjustments
    // - Supply tracking
    // - Economic events
  }
  
  /**
   * Get the underlying EconomySystem.
   */
  getEconomySystem(): EconomySystem {
    return this.economySystem;
  }
  
  onStart(): void {
    console.log('[EconomyTickSystem] Started - economy processing active');
  }
}

/**
 * Register EconomySystem with the global registry.
 */
export function registerEconomySystem(economySystem: EconomySystem): EconomyTickSystem {
  const system = new EconomyTickSystem(economySystem);
  
  tickSystemRegistry.register({
    system,
    dependencies: [], // Economy is independent
    tags: ['economy', 'market', 'gameplay'],
  });
  
  return system;
}