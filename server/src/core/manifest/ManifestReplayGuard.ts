/**
 * ManifestReplayGuard
 * 
 * Prevents replay attacks by tracking accepted ticks and nonces.
 * 
 * Design: Stateless ring buffer that limits memory growth.
 * Stores only recent ticks/nonces, evicts old ones automatically.
 */

import type { GlobalStateManifest, IReplayGuardState } from './ManifestTypes.js';

const MAX_REPLAY_CACHE_SIZE = 10000;
const MAX_TICK_GAP = 100;

export class ManifestReplayGuard {
  private highestTick = -1;
  private seenNonces = new Set<string>();
  private nonceOrder: string[] = [];
  private quarantinedNonces = new Set<string>();

  /**
   * Attempt to accept a manifest.
   * Returns true if the manifest is new and valid.
   * Returns false if it's a replay or invalid.
   */
  public accept(manifest: GlobalStateManifest): { accepted: boolean; reason?: string } {
    const { header } = manifest;

    // Check tick sequence - reject if not advancing
    if (header.tickSequence <= this.highestTick) {
      return {
        accepted: false,
        reason: `Tick ${header.tickSequence} not newer than highest ${this.highestTick}`
      };
    }

    // Check for tick gap (unless it's a snapshot/rollback)
    const tickGap = header.tickSequence - this.highestTick;
    if (tickGap > MAX_TICK_GAP && header.kind === 'world_tick') {
      return {
        accepted: false,
        reason: `Tick gap too large: ${tickGap} (max ${MAX_TICK_GAP})`
      };
    }

    // Check nonce - reject if seen before
    if (this.seenNonces.has(header.integrityNonce)) {
      return {
        accepted: false,
        reason: `Nonce ${header.integrityNonce.slice(0, 8)}... already seen`
      };
    }

    // Check quarantine list
    if (this.quarantinedNonces.has(header.integrityNonce)) {
      return {
        accepted: false,
        reason: `Nonce ${header.integrityNonce.slice(0, 8)}... is quarantined`
      };
    }

    // Accept the manifest
    this.recordAcceptance(header.tickSequence, header.integrityNonce);
    return { accepted: true };
  }

  /**
   * Record acceptance of a manifest.
   */
  private recordAcceptance(tick: number, nonce: string): void {
    this.highestTick = tick;
    
    // Add nonce to tracking
    this.seenNonces.add(nonce);
    this.nonceOrder.push(nonce);

    // Evict oldest nonces if we're over the limit
    while (this.nonceOrder.length > MAX_REPLAY_CACHE_SIZE) {
      const oldest = this.nonceOrder.shift();
      if (oldest) this.seenNonces.delete(oldest);
    }
  }

  /**
   * Quarantine a nonce (for suspected tampering).
   */
  public quarantine(nonce: string): void {
    this.seenNonces.delete(nonce);
    this.quarantinedNonces.add(nonce);
  }

  /**
   * Get the highest accepted tick.
   */
  public getHighestTick(): number {
    return this.highestTick;
  }

  /**
   * Get the count of tracked nonces.
   */
  public getNonceCount(): number {
    return this.seenNonces.size;
  }

  /**
   * Get current state for serialization.
   */
  public getState(): IReplayGuardState {
    return {
      highestAcceptedTick: this.highestTick,
      seenNonces: [...this.seenNonces],
      quarantinedNonces: [...this.quarantinedNonces],
    };
  }

  /**
   * Restore state from serialization.
   */
  public restoreState(state: IReplayGuardState): void {
    this.highestTick = state.highestAcceptedTick;
    this.seenNonces = new Set(state.seenNonces);
    this.nonceOrder = [...state.seenNonces];
    this.quarantinedNonces = new Set(state.quarantinedNonces);
  }

  /**
   * Reset the guard to initial state.
   */
  public reset(): void {
    this.highestTick = -1;
    this.seenNonces.clear();
    this.nonceOrder = [];
    this.quarantinedNonces.clear();
  }

  /**
   * Prune old entries up to a given tick.
   * Use this to clean up memory after a rollback.
   */
  public pruneBefore(tick: number): number {
    // For now, just clear everything below the tick
    // A more sophisticated approach would track tick ranges
    const before = this.seenNonces.size;
    this.seenNonces.clear();
    this.nonceOrder = [];
    this.highestTick = Math.max(this.highestTick, tick);
    return before - this.seenNonces.size;
  }
}

/**
 * Shared replay guard instance for server use.
 */
export const globalReplayGuard = new ManifestReplayGuard();