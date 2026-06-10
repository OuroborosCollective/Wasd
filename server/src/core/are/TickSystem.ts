/**
 * TickSystem - Core Interface for ARE Tick Systems
 * 
 * Phase 2 of the Core Reality Alignment initiative establishes the
 * TickSystemRegistry pattern to decouple WorldTick from domain systems.
 * 
 * Each domain system (Combat, NPC, Economy, etc.) implements this interface
 * and registers with the TickSystemRegistry. WorldTick iterates the registry
 * and calls tick() on each system in order.
 * 
 * Benefits:
 * - Reduced coupling (WorldTick no longer imports domain systems directly)
 * - Testability (each system can be tested in isolation)
 * - Determinism (ordered execution enables reproducible replay)
 * - Extensibility (new systems add via registry, no WorldTick modification)
 */

import type { TickId } from './types.js';

/**
 * TickSystemPriority determines execution order.
 * Lower numbers execute first.
 */
export enum TickSystemPriority {
  INFRASTRUCTURE = 0,   // Core systems (spatial grid, manifest)
  FOUNDATION = 10,       // Base systems (player, NPC)
  GAMEPLAY = 20,         // Gameplay systems (combat, economy, quest)
  BROADCAST = 30,        // Network broadcasting
  PERSISTENCE = 40,      // Write-behind persistence
}

/**
 * TickSystemContext provides common dependencies passed to each system.
 */
export interface TickSystemContext {
  tickCount: TickId;
  isHighFrequencyTick: boolean; // Every tick vs every N ticks
}

/**
 * TickSystem is the base interface for all tickable systems.
 * All domain systems must implement this interface to participate in the tick loop.
 */
export interface TickSystem {
  /** Unique identifier for this tick system */
  readonly name: string;
  
  /** Execution priority (lower = earlier) */
  readonly priority: TickSystemPriority;
  
  /** Whether this system is currently enabled */
  enabled: boolean;
  
  /**
   * Execute one tick of this system.
   * 
   * @param context - Provides tick metadata and common dependencies
   * 
   * @remarks
   * Implementations should:
   * - Be idempotent (safe to call multiple times per tick if needed)
   * - Not perform blocking I/O (use async queues for persistence)
   * - Use DeterministicPrng for any randomness (not Math.random)
   * - Return quickly (sub-millisecond target for hot path)
   */
  tick(context: TickSystemContext): void;
  
  /**
   * Optional hook called before the main tick loop starts.
   * Use for initialization that requires other systems to be ready.
   */
  onStart?(): void;
  
  /**
   * Optional hook called after the main tick loop ends.
   * Use for cleanup or flush operations.
   */
  onEnd?(): void;
  
  /**
   * Optional hook called when the world is being shut down.
   * Use for final persistence or cleanup.
   */
  onShutdown?(): void;
}

/**
 * TickSystemDescriptor wraps a TickSystem with metadata for the registry.
 */
export interface TickSystemDescriptor {
  system: TickSystem;
  dependencies: string[]; // Names of other systems this depends on
  tags: string[]; // For filtering/grouping (e.g., ['spatial', 'combat'])
}

/**
 * Default tick context for systems that don't need special handling.
 */
export function createDefaultTickContext(tickCount: number): TickSystemContext {
  return {
    tickCount: tickCount as TickId,
    isHighFrequencyTick: true,
  };
}