/**
 * WarfrontTickSystem - Warfront cycle management TickSystem
 * 
 * Phase 3 of Core Reality Alignment initiative.
 * 
 * This system wraps WarfrontSystem to implement the TickSystem interface,
 * enabling it to be registered with the TickSystemRegistry.
 * 
 * WarfrontSystem manages battle cycles, boss mutators, and rewards.
 */

import { TickSystem, TickSystemPriority, type TickSystemContext } from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';
import { WarfrontSystem } from '../../modules/warfront/WarfrontSystem.js';

/**
 * WarfrontTickSystem implements TickSystem for the Warfront module.
 */
export class WarfrontTickSystem implements TickSystem {
  readonly name = 'warfront';
  readonly priority = TickSystemPriority.GAMEPLAY;
  enabled = true;
  
  private warfrontSystem: WarfrontSystem;
  private tickMultiplier = 100; // tickCount * 100 for warfront time
  
  constructor(warfrontSystem: WarfrontSystem) {
    this.warfrontSystem = warfrontSystem;
  }
  
  tick(context: TickSystemContext): void {
    this.warfrontSystem.tick(context.tickCount * this.tickMultiplier);
  }
  
  /**
   * Get the underlying WarfrontSystem for direct access if needed.
   */
  getWarfrontSystem(): WarfrontSystem {
    return this.warfrontSystem;
  }
}

/**
 * Register WarfrontSystem with the global registry.
 * Call this during server initialization.
 */
export function registerWarfrontSystem(warfrontSystem: WarfrontSystem): WarfrontTickSystem {
  const system = new WarfrontTickSystem(warfrontSystem);
  
  tickSystemRegistry.register({
    system,
    dependencies: ['player-system', 'npc-system'], // Warfront affects NPCs and players
    tags: ['warfront', 'combat', 'gameplay'],
  });
  
  return system;
}
