/**
 * TickSystemRegistry - Central registry for all ARE tick systems
 * 
 * Phase 2 of the Core Reality Alignment initiative.
 * 
 * This registry replaces the direct domain imports in WorldTick.ts with
 * a decoupled pattern where systems register themselves and WorldTick
 * iterates the registry to execute ticks.
 * 
 * Architecture:
 * 1. Systems register via TickSystemRegistry.register()
 * 2. WorldTick.tick() calls registry.executeAll(context)
 * 3. Registry sorts by priority and calls each system's tick()
 * 
 * Benefits:
 * - WorldTick no longer needs to import domain systems
 * - Systems can be enabled/disabled at runtime
 * - Execution order is explicit via priority
 * - Testing can mock or replace individual systems
 */

import type { TickSystem, TickSystemDescriptor, TickSystemContext, TickSystemPriority } from './TickSystem.js';

/**
 * Registry event types for observability.
 */
export type TickSystemRegistryEvent =
  | { type: 'registered'; system: string; priority: TickSystemPriority }
  | { type: 'unregistered'; system: string }
  | { type: 'enabled'; system: string }
  | { type: 'disabled'; system: string }
  | { type: 'tick_start'; tick: number }
  | { type: 'tick_end'; tick: number; durationMs: number }
  | { type: 'system_error'; system: string; error: Error };

/**
 * TickSystemRegistry maintains all registered tick systems and orchestrates execution.
 */
export class TickSystemRegistry {
  private systems: Map<string, TickSystemDescriptor> = new Map();
  private sortedSystems: TickSystemDescriptor[] = [];
  private dirty = true; // Marks when sorting needs to be recalculated
  private listeners: Set<(event: TickSystemRegistryEvent) => void> = new Set();
  private tickDuration = 0;

  /**
   * Register a tick system with the registry.
   * 
   * @param descriptor - The system descriptor containing the system and its metadata
   * 
   * @example
   * ```typescript
   * registry.register({
   *   system: combatSystem,
   *   dependencies: ['player-system'],
   *   tags: ['combat', 'damage']
   * });
   * ```
   */
  register(descriptor: TickSystemDescriptor): void {
    const { system } = descriptor;
    
    if (this.systems.has(system.name)) {
      console.warn(`[TickSystemRegistry] System "${system.name}" already registered, replacing.`);
    }
    
    this.systems.set(system.name, descriptor);
    this.dirty = true;
    
    this.emit({ type: 'registered', system: system.name, priority: system.priority });
  }

  /**
   * Unregister a tick system by name.
   */
  unregister(systemName: string): boolean {
    const removed = this.systems.delete(systemName);
    if (removed) {
      this.dirty = true;
      this.emit({ type: 'unregistered', system: systemName });
    }
    return removed;
  }

  /**
   * Get a registered system by name.
   */
  get(systemName: string): TickSystem | undefined {
    return this.systems.get(systemName)?.system;
  }

  /**
   * Get all registered systems.
   */
  getAll(): TickSystem[] {
    this.rebuildSortedList();
    return this.sortedSystems.map(d => d.system);
  }

  /**
   * Get systems by tag.
   */
  getByTag(tag: string): TickSystem[] {
    this.rebuildSortedList();
    return this.sortedSystems
      .filter(d => d.tags.includes(tag))
      .map(d => d.system);
  }

  /**
   * Enable a system by name.
   */
  enable(systemName: string): boolean {
    const descriptor = this.systems.get(systemName);
    if (!descriptor) return false;
    
    descriptor.system.enabled = true;
    this.emit({ type: 'enabled', system: systemName });
    return true;
  }

  /**
   * Disable a system by name.
   */
  disable(systemName: string): boolean {
    const descriptor = this.systems.get(systemName);
    if (!descriptor) return false;
    
    descriptor.system.enabled = false;
    this.emit({ type: 'disabled', system: systemName });
    return true;
  }

  /**
   * Check if a system is enabled.
   */
  isEnabled(systemName: string): boolean {
    return this.systems.get(systemName)?.system.enabled ?? false;
  }

  /**
   * Execute all enabled systems in priority order.
   * 
   * @param context - The tick context passed to each system
   */
  executeAll(context: TickSystemContext): void {
    this.rebuildSortedList();
    
    const start = performance.now();
    this.emit({ type: 'tick_start', tick: context.tickCount });
    
    for (const descriptor of this.sortedSystems) {
      const { system } = descriptor;
      
      if (!system.enabled) continue;
      
      try {
        system.tick(context);
      } catch (error) {
        console.error(`[TickSystemRegistry] Error in system "${system.name}":`, error);
        this.emit({ type: 'system_error', system: system.name, error: error as Error });
      }
    }
    
    const end = performance.now();
    this.tickDuration = end - start;
    this.emit({ type: 'tick_end', tick: context.tickCount, durationMs: this.tickDuration });
  }

  /**
   * Call onStart() for all systems that implement it.
   */
  notifyStart(): void {
    for (const descriptor of this.systems.values()) {
      const { system } = descriptor;
      if (system.onStart) {
        try {
          system.onStart();
        } catch (error) {
          console.error(`[TickSystemRegistry] Error in onStart for "${system.name}":`, error);
        }
      }
    }
  }

  /**
   * Call onEnd() for all systems that implement it.
   */
  notifyEnd(): void {
    for (const descriptor of this.systems.values()) {
      const { system } = descriptor;
      if (system.onEnd) {
        try {
          system.onEnd();
        } catch (error) {
          console.error(`[TickSystemRegistry] Error in onEnd for "${system.name}":`, error);
        }
      }
    }
  }

  /**
   * Call onShutdown() for all systems that implement it.
   */
  notifyShutdown(): void {
    for (const descriptor of this.systems.values()) {
      const { system } = descriptor;
      if (system.onShutdown) {
        try {
          system.onShutdown();
        } catch (error) {
          console.error(`[TickSystemRegistry] Error in onShutdown for "${system.name}":`, error);
        }
      }
    }
  }

  /**
   * Get statistics about the registry.
   */
  getStats(): {
    totalSystems: number;
    enabledSystems: number;
    disabledSystems: number;
    lastTickDurationMs: number;
    systemsByPriority: Record<number, string[]>;
  } {
    const systemsByPriority: Record<number, string[]> = {};
    let enabled = 0;
    let disabled = 0;
    
    for (const descriptor of this.systems.values()) {
      const { system } = descriptor;
      const p = system.priority;
      if (!systemsByPriority[p]) systemsByPriority[p] = [];
      systemsByPriority[p].push(system.name);
      
      if (system.enabled) enabled++;
      else disabled++;
    }
    
    return {
      totalSystems: this.systems.size,
      enabledSystems: enabled,
      disabledSystems: disabled,
      lastTickDurationMs: this.tickDuration,
      systemsByPriority,
    };
  }

  /**
   * Subscribe to registry events.
   */
  subscribe(listener: (event: TickSystemRegistryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: TickSystemRegistryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[TickSystemRegistry] Listener error:', e);
      }
    }
  }

  private rebuildSortedList(): void {
    if (!this.dirty) return;
    
    this.sortedSystems = Array.from(this.systems.values())
      .sort((a, b) => a.system.priority - b.system.priority);
    
    this.dirty = false;
  }
}

/**
 * Global registry instance.
 * Systems should import and use this instance.
 */
export const tickSystemRegistry = new TickSystemRegistry();