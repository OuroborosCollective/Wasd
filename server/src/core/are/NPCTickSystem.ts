/**
 * NPCTickSystem - NPC processing TickSystem
 * 
 * Phase 5 of the Core Reality Alignment initiative.
 * 
 * This system wraps NPCSystem to implement the TickSystem interface.
 * NPCs handle:
 * - Autonomous behavior (movement, decision making)
 * - Emergence events (spontaneous world interactions)
 * - Chat events (NPC dialogue)
 * - Combat behavior
 */

import { TickSystem, TickSystemPriority, type TickSystemContext } from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';
import type { NPCSystem } from '../modules/npc/NPCSystem.js';

/**
 * NPCTickSystem implements TickSystem for NPC processing.
 */
export class NPCTickSystem implements TickSystem {
  readonly name = 'npc';
  readonly priority = TickSystemPriority.FOUNDATION;
  enabled = true;
  
  private npcSystem: NPCSystem;
  private playersProvider: (() => any[]) | null = null;
  private worldTimeProvider: (() => number) | null = null;
  
  constructor(npcSystem: NPCSystem) {
    this.npcSystem = npcSystem;
  }
  
  /**
   * Set providers for NPC system dependencies.
   */
  setPlayersProvider(provider: () => any[]): void {
    this.playersProvider = provider;
  }
  
  setWorldTimeProvider(provider: () => number): void {
    this.worldTimeProvider = provider;
  }
  
  tick(context: TickSystemContext): void {
    const players = this.playersProvider?.() ?? [];
    const worldTime = this.worldTimeProvider?.() ?? context.tickCount * 100;
    
    this.npcSystem.tick(players, worldTime);
  }
  
  /**
   * Get all NPCs from the underlying system.
   */
  getAllNPCs(): any[] {
    return this.npcSystem.getAllNPCs?.() ?? [];
  }
  
  /**
   * Drain chat events from NPC system.
   */
  drainChatEvents(): any[] {
    return this.npcSystem.drainWorldChatEvents?.() ?? [];
  }
  
  /**
   * Collect emergence events from NPC system.
   */
  collectEmergenceEvents(): any[] {
    return this.collectNpcEmergenceEvents?.() ?? [];
  }
  
  onStart(): void {
    console.log('[NPCTickSystem] Started - NPC processing active');
  }
}

/**
 * Register NPCSystem with the global registry.
 */
export function registerNPCSystem(npcSystem: NPCSystem): NPCTickSystem {
  const system = new NPCTickSystem(npcSystem);
  
  tickSystemRegistry.register({
    system,
    dependencies: ['player-system'], // NPCs react to player positions
    tags: ['npc', 'ai', 'emergence', 'gameplay'],
  });
  
  return system;
}