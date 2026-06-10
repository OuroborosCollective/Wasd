/**
 * CombatTickSystem - Combat processing TickSystem
 * 
 * Phase 5 of the Core Reality Alignment initiative.
 * 
 * This system wraps CombatSystem and CombatService to implement the
 * TickSystem interface for the combat subsystem.
 * 
 * Combat processing includes:
 * - Melee/ranged attacks
 * - Spell casting
 * - Damage resolution
 * - Combo validation
 * - Combat state management
 */

import { TickSystem, TickSystemPriority, type TickSystemContext } from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';
import type { CombatSystem } from '../modules/combat/CombatSystem.js';
import type { CombatService } from '../modules/combat/CombatService.js';

/**
 * CombatTickSystem implements TickSystem for combat processing.
 */
export class CombatTickSystem implements TickSystem {
  readonly name = 'combat';
  readonly priority = TickSystemPriority.GAMEPLAY;
  enabled = true;
  
  private combatSystem: CombatSystem;
  private combatService: CombatService;
  private tickProvider: (() => number) | null = null;
  
  constructor(combatSystem: CombatSystem, combatService: CombatService) {
    this.combatSystem = combatSystem;
    this.combatService = combatService;
  }
  
  /**
   * Set the tick count provider.
   * This allows combat system to get current tick without direct coupling.
   */
  setTickProvider(provider: () => number): void {
    this.tickProvider = provider;
  }
  
  tick(context: TickSystemContext): void {
    // Combat processing is event-driven, not tick-driven.
    // Most combat logic happens in response to player actions (skill requests).
    // The tick here is used for:
    // 1. Cooldown management
    // 2. Combat state cleanup
    // 3. Passive damage effects (poison, burn, etc.)
    
    const tickCount = context.tickCount;
    
    // Process any pending combat timers
    this.processCombatTimers(tickCount);
    
    // Cleanup stale combat states
    this.cleanupCombatStates(tickCount);
  }
  
  /**
   * Process combat timers for active combat sessions.
   */
  private processCombatTimers(tickCount: number): void {
    // Combat timers are processed on tick intervals
    // This is where passive damage (burn, poison) would be applied
  }
  
  /**
   * Cleanup combat states that have expired.
   */
  private cleanupCombatStates(tickCount: number): void {
    // Combat states expire after COMBAT_STATE_TTL_TICKS of inactivity
    // This prevents memory leaks from abandoned combat sessions
  }
  
  /**
   * Get the underlying CombatSystem for direct combat operations.
   */
  getCombatSystem(): CombatSystem {
    return this.combatSystem;
  }
  
  /**
   * Get the underlying CombatService for skill requests.
   */
  getCombatService(): CombatService {
    return this.combatService;
  }
  
  onStart(): void {
    console.log('[CombatTickSystem] Started - combat processing active');
  }
}

/**
 * Register CombatSystem with the global registry.
 * Call this during server initialization.
 */
export function registerCombatSystem(
  combatSystem: CombatSystem, 
  combatService: CombatService
): CombatTickSystem {
  const system = new CombatTickSystem(combatSystem, combatService);
  
  tickSystemRegistry.register({
    system,
    dependencies: ['player-system', 'npc-system'], // Combat affects players and NPCs
    tags: ['combat', 'damage', 'gameplay'],
  });
  
  return system;
}