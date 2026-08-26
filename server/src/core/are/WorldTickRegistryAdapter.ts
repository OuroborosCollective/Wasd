/**
 * WorldTickRegistryAdapter - Integration pattern for WorldTick
 *
 * The adapter keeps the legacy WorldTick surface compatible while delegating
 * execution to the canonical TickSystemRegistry.
 */

import {
  tickSystemRegistry,
  type TickSystemRegistry,
} from './TickSystemRegistry.js';
import {
  createDefaultTickContext,
  type TickSystem,
} from './TickSystem.js';

export class WorldTickRegistryAdapter {
  private isInitialized = false;
  private readonly registry: TickSystemRegistry;

  constructor(registry: TickSystemRegistry = tickSystemRegistry) {
    this.registry = registry;
  }

  initialize(): void {
    if (this.isInitialized) return;

    console.log('[WorldTickRegistryAdapter] Initializing tick system registry...');
    this.registerInfrastructureSystems();
    this.registerGameplaySystems();
    this.registerBroadcastSystems();
    this.registry.notifyStart();
    this.isInitialized = true;

    const stats = this.registry.getStats();
    console.log(`[WorldTickRegistryAdapter] Registered ${stats.totalSystems} systems (${stats.enabledSystems} enabled)`);
  }

  executeAll(tickCount: number, isHighFrequencyTick = true): void {
    const context = {
      ...createDefaultTickContext(tickCount),
      isHighFrequencyTick,
    };

    this.registry.executeAll(context);
  }

  getStats() {
    return this.registry.getStats();
  }

  setSystemEnabled(systemName: string, enabled: boolean): boolean {
    return enabled
      ? this.registry.enable(systemName)
      : this.registry.disable(systemName);
  }

  getSystem(systemName: string): TickSystem | undefined {
    return this.registry.get(systemName);
  }

  shutdown(): void {
    console.log('[WorldTickRegistryAdapter] Shutting down tick systems...');
    this.registry.notifyShutdown();
  }

  private registerInfrastructureSystems(): void {
    // Manifest system integration belongs here when the legacy WorldTick path is retired.
  }

  private registerGameplaySystems(): void {
    // Gameplay systems are registered by their owning ports during bootstrap.
  }

  private registerBroadcastSystems(): void {
    // Broadcast systems are registered once providers are available.
  }
}

export function createWorldTickRegistryAdapter(): WorldTickRegistryAdapter {
  return new WorldTickRegistryAdapter();
}
