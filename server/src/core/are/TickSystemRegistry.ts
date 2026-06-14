/**
 * TickSystemRegistry - Central registry for all ARE tick systems
 *
 * Systems register themselves once. WorldTickThinShell executes the registry in
 * deterministic order: priority first, then stable system identity.
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

export interface TickSystemRegistrySnapshotEntry {
  readonly id: string;
  readonly name: string;
  readonly priority: TickSystemPriority;
  readonly enabled: boolean;
  readonly dependencies: readonly string[];
  readonly tags: readonly string[];
}

function systemIdentity(system: TickSystem): string {
  const id = typeof system.id === 'string' && system.id.trim().length > 0
    ? system.id.trim()
    : system.name.trim();
  return id;
}

function normalizeDescriptor(descriptor: TickSystemDescriptor): TickSystemDescriptor {
  const { system } = descriptor;
  const name = typeof system.name === 'string' ? system.name.trim() : '';
  const id = systemIdentity(system);

  if (name.length === 0) {
    throw new Error('TickSystem requires a stable non-empty name');
  }

  if (id.length === 0) {
    throw new Error(`TickSystem "${name}" requires a stable non-empty id/name`);
  }

  if (!Number.isFinite(Number(system.priority))) {
    throw new Error(`TickSystem "${name}" requires a finite numeric priority`);
  }

  return {
    system,
    dependencies: [...descriptor.dependencies].map(String).sort(),
    tags: [...descriptor.tags].map(String).sort(),
  };
}

function compareDescriptors(a: TickSystemDescriptor, b: TickSystemDescriptor): number {
  const byPriority = Number(a.system.priority) - Number(b.system.priority);
  if (byPriority !== 0) return byPriority;

  const byId = systemIdentity(a.system).localeCompare(systemIdentity(b.system));
  if (byId !== 0) return byId;

  return a.system.name.localeCompare(b.system.name);
}

/**
 * TickSystemRegistry maintains all registered tick systems and orchestrates execution.
 */
export class TickSystemRegistry {
  private systems: Map<string, TickSystemDescriptor> = new Map();
  private sortedSystems: TickSystemDescriptor[] = [];
  private dirty = true;
  private listeners: Set<(event: TickSystemRegistryEvent) => void> = new Set();
  private tickDuration = 0;

  /**
   * Register a tick system with the registry.
   */
  register(descriptor: TickSystemDescriptor): void {
    const normalized = normalizeDescriptor(descriptor);
    const { system } = normalized;

    if (this.systems.has(system.name)) {
      console.warn(`[TickSystemRegistry] System "${system.name}" already registered, replacing.`);
    }

    this.systems.set(system.name, normalized);
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
   * Check whether a system is registered.
   */
  has(systemName: string): boolean {
    return this.systems.has(systemName);
  }

  /**
   * Get all registered systems in deterministic execution order.
   */
  getAll(): TickSystem[] {
    this.rebuildSortedList();
    return this.sortedSystems.map(d => d.system);
  }

  /**
   * Get systems by tag in deterministic execution order.
   */
  getByTag(tag: string): TickSystem[] {
    this.rebuildSortedList();
    return this.sortedSystems
      .filter(d => d.tags.includes(tag))
      .map(d => d.system);
  }

  /**
   * Deterministic registry snapshot for probes, tests and docs.
   */
  getRegistrationSnapshot(): readonly TickSystemRegistrySnapshotEntry[] {
    this.rebuildSortedList();
    return Object.freeze(this.sortedSystems.map((descriptor) => Object.freeze({
      id: systemIdentity(descriptor.system),
      name: descriptor.system.name,
      priority: descriptor.system.priority,
      enabled: descriptor.system.enabled,
      dependencies: Object.freeze([...descriptor.dependencies]),
      tags: Object.freeze([...descriptor.tags]),
    })));
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
   * Execute all enabled systems in deterministic priority/id order.
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
   * Call onStart() for all systems that implement it in deterministic order.
   */
  notifyStart(): void {
    this.rebuildSortedList();
    for (const descriptor of this.sortedSystems) {
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
   * Call onEnd() for all systems that implement it in deterministic order.
   */
  notifyEnd(): void {
    this.rebuildSortedList();
    for (const descriptor of this.sortedSystems) {
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
   * Call onShutdown() for all systems that implement it in deterministic order.
   */
  notifyShutdown(): void {
    this.rebuildSortedList();
    for (const descriptor of this.sortedSystems) {
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

    for (const descriptor of this.getRegistrationSnapshot()) {
      const p = Number(descriptor.priority);
      if (!systemsByPriority[p]) systemsByPriority[p] = [];
      systemsByPriority[p].push(descriptor.name);

      if (descriptor.enabled) enabled++;
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

    this.sortedSystems = Array.from(this.systems.values()).sort(compareDescriptors);
    this.dirty = false;
  }
}

/**
 * Global registry instance.
 * Systems should import and use this instance.
 */
export const tickSystemRegistry = new TickSystemRegistry();
