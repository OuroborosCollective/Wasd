/**
 * GuildTickSystem - Guild management TickSystem
 * 
 * Phase 6 of the Core Reality Alignment initiative.
 * 
 * GuildSystem handles:
 * - Guild membership
 * - Guild resources (bank, gold)
 * - Guild perks and upgrades
 */

import { TickSystem, TickSystemPriority, type TickSystemContext } from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';
import { GuildSystem } from '../../modules/guild/GuildSystem.js';

/**
 * GuildTickSystem implements TickSystem for guild processing.
 */
export class GuildTickSystem implements TickSystem {
  readonly name = 'guild';
  readonly priority = TickSystemPriority.GAMEPLAY;
  enabled = true;
  
  private guildSystem: GuildSystem;
  
  constructor(guildSystem: GuildSystem) {
    this.guildSystem = guildSystem;
  }
  
  tick(context: TickSystemContext): void {
    // Guild processing is mostly transaction-based
    // Periodic tasks include:
    // - Guild tax collection
    // - Member activity tracking
    // - Perk maintenance
  }
  
  /**
   * Get the underlying GuildSystem.
   */
  getGuildSystem(): GuildSystem {
    return this.guildSystem;
  }
  
  onStart(): void {
    console.log('[GuildTickSystem] Started - guild processing active');
  }
}

/**
 * Register GuildSystem with the global registry.
 */
export function registerGuildSystem(guildSystem: GuildSystem): GuildTickSystem {
  const system = new GuildTickSystem(guildSystem);
  
  tickSystemRegistry.register({
    system,
    dependencies: ['player-system'], // Guilds are player-centric
    tags: ['guild', 'social', 'gameplay'],
  });
  
  return system;
}