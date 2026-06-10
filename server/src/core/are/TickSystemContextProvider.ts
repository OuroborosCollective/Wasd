/**
 * TickSystemContextProvider - Phase 11: Ouroboros Loop Integration
 * 
 * Provides deterministic tick context to HTTP routes without coupling
 * to the legacy WorldTick.ts. Routes use this provider to get:
 * - tickId: monotonically increasing simulation tick
 * - tickTimestamp: deterministic timestamp (not wall-clock)
 * - seedHash: deterministic seed for procedural generation
 * 
 * This enables ARE-Logic deterministic behavior in HTTP endpoints.
 */

import { createTickId, type TickId } from './types.js';

// ============================================================================
// Tick System Context Interface
// ============================================================================

export interface TickContext {
  /** Current simulation tick ID */
  readonly tickId: TickId;
  
  /** Deterministic tick index (same as tickId) */
  readonly tickIndex: number;
  
  /** World time in hours (0-23.99) based on tick modulo 1000 */
  readonly worldTimeHours: number;
  
  /** Deterministic timestamp derived from tick (not wall-clock) */
  readonly tickTimestamp: number;
  
  /** Seed hash for deterministic procedural generation */
  readonly seedHash: string;
}

/**
 * StableTickContextProvider - Provides stable deterministic tick context
 * 
 * For HTTP routes that need tick-aware behavior without the full WorldTick.
 * Uses a simple counter that's updated by the tick system registry.
 */
export class TickSystemContextProvider {
  private static instance: TickSystemContextProvider | null = null;
  
  private tickCounter: number = 0;
  private lastSeedHash: string = 'GENESIS';
  
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  static getInstance(): TickSystemContextProvider {
    if (!TickSystemContextProvider.instance) {
      TickSystemContextProvider.instance = new TickSystemContextProvider();
    }
    return TickSystemContextProvider.instance;
  }
  
  /**
   * Update the tick counter (called by WorldTick or WorldTickThinShell)
   */
  updateTick(tickId: number, seedHash?: string): void {
    this.tickCounter = tickId;
    if (seedHash) {
      this.lastSeedHash = seedHash;
    }
  }
  
  /**
   * Get current tick context
   */
  getContext(): TickContext {
    return this.createContext(this.tickCounter);
  }
  
  /**
   * Get context for a specific tick (for replay/history)
   */
  getContextForTick(tickId: number): TickContext {
    return this.createContext(tickId);
  }
  
  /**
   * Create a context object for a given tick
   */
  private createContext(tickId: number): TickContext {
    // World time: deterministic 0-23.99 hours based on tick modulo 1000
    const worldTimeHours = (tickId % 1000) / 1000 * 24;
    
    // Deterministic timestamp: tick ID as pseudo-timestamp
    // This is deterministic and reproducible (not wall-clock)
    const tickTimestamp = tickId * 100; // Each tick = 100ms of simulation time
    
    // Seed hash: deterministic based on tick
    const seedHash = this.deriveSeedHash(tickId);
    
    return {
      tickId: createTickId(tickId),
      tickIndex: tickId,
      worldTimeHours,
      tickTimestamp,
      seedHash,
    };
  }
  
  /**
   * Derive a deterministic seed hash from tick ID
   * Uses FNV-1a for stable hashing
   */
  private deriveSeedHash(tickId: number): string {
    // Simple FNV-1a hash for deterministic seed
    let hash = 2166136261;
    const prime = 16777619;
    
    // Hash the tick ID
    let value = tickId;
    while (value !== 0) {
      hash ^= value & 0xff;
      hash = Math.imul(hash, prime);
      value = Math.floor(value / 256);
    }
    
    // Convert to hex string (64 chars for ARE compatibility)
    const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
    return (hashStr.repeat(8)).slice(0, 64);
  }
  
  /**
   * Get current tick ID
   */
  getTickId(): TickId {
    return createTickId(this.tickCounter);
  }
  
  /**
   * Get current tick counter value
   */
  getTickCounter(): number {
    return this.tickCounter;
  }
  
  /**
   * Check if the provider has been initialized
   */
  isInitialized(): boolean {
    return this.tickCounter > 0;
  }
}

// ============================================================================
// Global Provider Instance
// ============================================================================

export const tickContextProvider = TickSystemContextProvider.getInstance();

// ============================================================================
// Helper Functions for Routes
// ============================================================================

/**
 * Get current tick context for use in HTTP route handlers
 */
export function getCurrentTickContext(): TickContext {
  return tickContextProvider.getContext();
}

/**
 * Get current tick ID
 */
export function getCurrentTickId(): TickId {
  return tickContextProvider.getTickId();
}

/**
 * Get tick-based world time (0-23.99 hours)
 */
export function getWorldTimeHours(): number {
  return tickContextProvider.getContext().worldTimeHours;
}

/**
 * Get deterministic seed for procedural generation
 */
export function getDeterministicSeed(): string {
  return tickContextProvider.getContext().seedHash;
}