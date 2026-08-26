/**
 * TickSystemRegistry - Central registry for all ARE tick systems
 *
 * Systems register themselves once. WorldTickThinShell executes the registry in
 * deterministic order: priority first, then stable system identity.
 */

import type {
  TickSystem,
  TickSystemDescriptor,
  TickSystemContext,
  TickSystemPriority,
  TickFailureRerunPolicy,
} from './TickSystem.js';
import {
  TickFailureFamilyRuntime,
  deriveTickFailure,
  type TickFailureRecord,
  type TickFailureRerunOutcome,
} from './TickFailureFamilyRuntime.js';

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
  | {
      type: 'system_error';
      tick: number;
      system: string;
      priority: TickSystemPriority;
      error: Error;
      failure: TickFailureRecord;
      rerunOutcome: TickFailureRerunOutcome;
    }
  | {
      type: 'system_rerun';
      tick: number;
      system: string;
      outcome: Exclude<TickFailureRerunOutcome, 'not_eligible'>;
      fingerprint: string;
    };

export interface TickSystemRegistrySnapshotEntry {
  readonly id: string;
  readonly name: string;
  readonly priority: TickSystemPriority;
  readonly enabled: boolean;
  readonly dependencies: readonly string[];
  readonly tags: readonly string[];
  readonly failureRerunPolicy: TickFailureRerunPolicy;
}

export interface TickSystemExecutionFailure {
  readonly system: string;
  readonly tick: number;
  readonly failure: TickFailureRecord;
  readonly rerunOutcome: TickFailureRerunOutcome;
}

export interface TickSystemExecutionReport {
  readonly tick: number;
  readonly visitedSystems: readonly string[];
  readonly failures: readonly TickSystemExecutionFailure[];
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

  const rerun = descriptor.failurePolicy?.rerun ?? 'never';
  if (rerun !== 'never' && rerun !== 'safe_same_context_once') {
    throw new Error(`TickSystem "${name}" has invalid failure rerun policy: ${String(rerun)}`);
  }

  return {
    system,
    dependencies: [...descriptor.dependencies].map(String).sort(),
    tags: [...descriptor.tags].map(String).sort(),
    failurePolicy: Object.freeze({ rerun }),
  };
}

function compareDescriptors(a: TickSystemDescriptor, b: TickSystemDescriptor): number {
  const byPriority = Number(a.system.priority) - Number(b.system.priority);
  if (byPriority !== 0) return byPriority;

  const byId = systemIdentity(a.system).localeCompare(systemIdentity(b.system));
  if (byId !== 0) return byId;

  return a.system.name.localeCompare(b.system.name);
}

function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error ?? 'unknown TickSystem failure'));
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
  private readonly failureRuntime: TickFailureFamilyRuntime;

  constructor(failureRuntime: TickFailureFamilyRuntime = new TickFailureFamilyRuntime()) {
    this.failureRuntime = failureRuntime;
  }

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

  getFailureRuntime(): TickFailureFamilyRuntime {
    return this.failureRuntime;
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
      failureRerunPolicy: descriptor.failurePolicy?.rerun ?? 'never',
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
   *
   * Failure handling is fail-closed with respect to reruns. A system is never
   * executed twice unless its descriptor explicitly opts into
   * safe_same_context_once. That opt-in is reserved for systems whose tick body
   * is proven side-effect-idempotent (for example the diagnostic probe system).
   */
  executeAll(context: TickSystemContext): TickSystemExecutionReport {
    this.rebuildSortedList();

    const start = performance.now();
    const tick = Number(context.tickCount);
    const visitedSystems: string[] = [];
    const failures: TickSystemExecutionFailure[] = [];
    this.emit({ type: 'tick_start', tick });

    for (const descriptor of this.sortedSystems) {
      const { system } = descriptor;

      if (!system.enabled) continue;
      visitedSystems.push(system.name);

      try {
        system.tick(context);
      } catch (error) {
        const rerunEligible = descriptor.failurePolicy?.rerun === 'safe_same_context_once';
        const originalError = asError(error);
        const failure = this.failureRuntime.recordFailure({
          tick,
          stage: 'system_tick',
          system: system.name,
          error,
          rerunEligible,
        });
        let rerunOutcome: TickFailureRerunOutcome = 'not_eligible';

        if ((error as any)?.failureFamilyProbe === true) {
          console.warn(`[TickSystemRegistry] Diagnostic failure-family probe "${system.name}" at tick ${tick}: ${originalError.message}`);
        } else {
          console.error(`[TickSystemRegistry] Error in system "${system.name}" at tick ${tick}:`, error);
        }

        if (rerunEligible) {
          try {
            system.tick(context);
            rerunOutcome = 'recovered';
            this.failureRuntime.recordRerunOutcome({
              fingerprint: failure.fingerprint,
              tick,
              outcome: 'recovered',
              stage: 'system_tick',
              system: system.name,
            });
          } catch (rerunError) {
            const rerunDerived = deriveTickFailure({
              tick,
              stage: 'system_tick',
              system: system.name,
              error: rerunError,
              rerunEligible: true,
            });
            rerunOutcome = rerunDerived.fingerprint === failure.fingerprint ? 'reproduced' : 'changed_failure';
            this.failureRuntime.recordRerunOutcome({
              fingerprint: failure.fingerprint,
              tick,
              outcome: rerunOutcome,
              error: rerunError,
              stage: 'system_tick',
              system: system.name,
            });
          }

          this.emit({
            type: 'system_rerun',
            tick,
            system: system.name,
            outcome: rerunOutcome as Exclude<TickFailureRerunOutcome, 'not_eligible'>,
            fingerprint: failure.fingerprint,
          });
        }

        const currentFailure = this.failureRuntime.getSnapshot().records.find((record) => record.fingerprint === failure.fingerprint) ?? failure;
        const executionFailure = Object.freeze({ system: system.name, tick, failure: currentFailure, rerunOutcome });
        failures.push(executionFailure);
        this.emit({
          type: 'system_error',
          tick,
          system: system.name,
          priority: system.priority,
          error: originalError,
          failure: currentFailure,
          rerunOutcome,
        });
      }
    }

    const end = performance.now();
    this.tickDuration = end - start;
    this.emit({ type: 'tick_end', tick, durationMs: this.tickDuration });
    return Object.freeze({
      tick,
      visitedSystems: Object.freeze(visitedSystems),
      failures: Object.freeze(failures),
    });
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
    failureFamilies: ReturnType<TickFailureFamilyRuntime['getSnapshot']>;
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
      failureFamilies: this.failureRuntime.getSnapshot(),
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
