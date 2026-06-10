/**
 * WorldTickRegistryAdapter - Integration pattern for WorldTick
 * 
 * Phase 4 of the Core Reality Alignment initiative.
 * 
 * This module demonstrates how WorldTick can transition to using
 * the TickSystemRegistry while maintaining backward compatibility.
 * 
 * The adapter pattern allows WorldTick to:
 * 1. Register its existing domain systems with the registry
 * 2. Execute all systems via registry.executeAll()
 * 3. Keep existing WorldTick logic for edge cases
 * 4. Gradually migrate functionality to TickSystems
 */

import { 
  tickSystemRegistry, 
  createDefaultTickContext,
  TickSystem,
  TickSystemPriority,
  type TickSystemContext 
} from './index.js';

/**
 * WorldTickRegistryAdapter wraps the transition from direct domain
 * imports to the registry pattern.
 */
export class WorldTickRegistryAdapter {
  private isInitialized = false;
  
  /**
   * Initialize the adapter and register all available systems.
   * This should be called once during WorldTick construction.
   */
  initialize(): void {
    if (this.isInitialized) return;
    
    console.log('[WorldTickRegistryAdapter] Initializing tick system registry...');
    
    // Register infrastructure systems
    this.registerInfrastructureSystems();
    
    // Register gameplay systems
    this.registerGameplaySystems();
    
    // Register broadcast systems
    this.registerBroadcastSystems();
    
    // Notify all systems that tick loop is starting
    tickSystemRegistry.notifyStart();
    
    this.isInitialized = true;
    
    const stats = tickSystemRegistry.getStats();
    console.log(`[WorldTickRegistryAdapter] Registered ${stats.totalSystems} systems (${stats.enabledSystems} enabled)`);
  }
  
  /**
   * Execute all registered tick systems.
   * Called from WorldTick.tick() in place of direct system.tick() calls.
   */
  executeAll(tickCount: number, isHighFrequencyTick = true): void {
    const context: TickSystemContext = {
      tickCount: tickCount as any,
      isHighFrequencyTick,
    };
    
    tickSystemRegistry.executeAll(context);
  }
  
  /**
   * Get registry statistics for monitoring.
   */
  getStats() {
    return tickSystemRegistry.getStats();
  }
  
  /**
   * Enable or disable a system by name.
   */
  setSystemEnabled(systemName: string, enabled: boolean): boolean {
    return enabled 
      ? tickSystemRegistry.enable(systemName)
      : tickSystemRegistry.disable(systemName);
  }
  
  /**
   * Get a registered system by name.
   */
  getSystem(systemName: string): TickSystem | undefined {
    return tickSystemRegistry.get(systemName);
  }
  
  /**
   * Shutdown all systems gracefully.
   */
  shutdown(): void {
    console.log('[WorldTickRegistryAdapter] Shutting down tick systems...');
    tickSystemRegistry.notifyShutdown();
  }
  
  private registerInfrastructureSystems(): void {
    // Manifest system - runs first (priority 0)
    // Note: WorldTickManifestManager integration would go here
    // registerManifestSystem(manifestManager);
  }
  
  private registerGameplaySystems(): void {
    // Warfront system - combat gameplay (priority 20)
    // Note: Requires WarfrontSystem instance from WorldTick
    // registerWarfrontSystem(this.warfrontSystem);
  }
  
  private registerBroadcastSystems(): void {
    // Spatial broadcast - network broadcasting (priority 30)
    // Note: Requires providers to be set up
    // registerSpatialBroadcastSystem();
  }
}

/**
 * createWorldTickRegistryAdapter creates a new adapter instance.
 */
export function createWorldTickRegistryAdapter(): WorldTickRegistryAdapter {
  return new WorldTickRegistryAdapter();
}

/**
 * Migration checklist for WorldTick:
 * 
 * □ Replace direct domain imports with registry access
 * □ Create TickSystem wrappers for each domain system
 * □ Move system construction to registry registration
 * □ Replace tick() calls with registry.executeAll()
 * □ Move broadcast logic to SpatialBroadcastTickSystem
 * □ Move persistence to WriteBehindPersistenceTickSystem
 * 
 * Each □ represents a PR-worthy change that can be tested independently.
 */