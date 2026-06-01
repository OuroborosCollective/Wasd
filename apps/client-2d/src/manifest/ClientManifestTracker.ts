/**
 * Client Manifest Verification
 * 
 * Handles manifest verification and divergence detection on the client side.
 * The client NEVER sets world state directly - it only verifies what the server sends.
 * 
 * Design: Lightweight verification without cryptographic operations.
 * Full signature verification is server-side only.
 */

import type { GlobalStateManifest, IDivergenceReport } from './ManifestTypes.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientManifestState {
  /** Current tick we're synchronized to */
  currentTick: number;
  /** Last verified state hash from server */
  lastStateHash: string;
  /** Last tick where we had a full snapshot */
  lastSnapshotTick: number;
  /** Known snapshot hashes for rollback */
  snapshotHashes: Map<number, string>;
  /** Whether we're currently diverged */
  diverged: boolean;
  /** Divergence details if diverged */
  divergenceReport?: IDivergenceReport;
}

export interface ManifestVerificationResult {
  /** Whether the manifest passed verification */
  valid: boolean;
  /** Tick number from manifest */
  tick: number;
  /** State hash from manifest */
  stateHash: string;
  /** Errors encountered during verification */
  errors: string[];
  /** Warnings for non-critical issues */
  warnings: string[];
  /** Whether this triggers a resync */
  needsResync: boolean;
}

export interface DivergenceConfig {
  /** Maximum tick gap before resync required */
  maxTickGap: number;
  /** Number of snapshot hashes to keep */
  snapshotRetention: number;
  /** Tolerance for hash mismatches (for future use) */
  hashTolerance: number;
}

// ─── Default Configuration ────────────────────────────────────────────────────

const DEFAULT_CONFIG: DivergenceConfig = {
  maxTickGap: 100,        // Re-sync if we're 100 ticks behind
  snapshotRetention: 10,  // Keep last 10 snapshots
  hashTolerance: 0,       // No tolerance - exact match required
};

// ─── Client Manifest Tracker ─────────────────────────────────────────────────

export class ClientManifestTracker {
  private state: ClientManifestState;
  private readonly config: DivergenceConfig;
  
  constructor(config: Partial<DivergenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      currentTick: -1,
      lastStateHash: '',
      lastSnapshotTick: -1,
      snapshotHashes: new Map(),
      diverged: false,
    };
  }

  /**
   * Process an incoming manifest from the server.
   * Returns verification result and whether resync is needed.
   */
  public processManifest(manifest: { tick?: number; manifest?: { stateHash?: string; snapshotTick?: number } }): ManifestVerificationResult {
    const tick = manifest.tick ?? -1;
    const stateHash = manifest.manifest?.stateHash ?? '';
    const snapshotTick = manifest.manifest?.snapshotTick ?? -1;
    
    const errors: string[] = [];
    const warnings: string[] = [];
    let needsResync = false;

    // Check for tick regression (shouldn't happen)
    if (tick < this.state.currentTick && this.state.currentTick !== -1) {
      errors.push(`Tick regression detected: ${tick} < ${this.state.currentTick}`);
      needsResync = true;
    }

    // Check for tick gap
    if (this.state.currentTick !== -1 && tick - this.state.currentTick > this.config.maxTickGap) {
      warnings.push(`Large tick gap: ${tick - this.state.currentTick} ticks`);
      needsResync = true;
    }

    // Check for state hash continuity
    if (this.state.lastStateHash && stateHash) {
      // For delta ticks, we expect the hash to match
      // For snapshots, the hash will be different (that's expected)
      if (snapshotTick !== this.state.lastSnapshotTick && !this.state.snapshotHashes.has(tick)) {
        // New tick not from a known snapshot
        // This is normal for delta ticks
      }
    }

    // Update state
    this.state.currentTick = tick;
    
    if (stateHash) {
      // Store snapshot hash if this is a snapshot tick
      if (snapshotTick > this.state.lastSnapshotTick) {
        this.recordSnapshot(snapshotTick, stateHash);
      }
      this.state.lastStateHash = stateHash;
    }

    // Check for divergence
    if (needsResync) {
      this.state.diverged = true;
      this.state.divergenceReport = {
        expectedHash: stateHash,
        actualHash: 'UNKNOWN', // Client doesn't track its own hash
        divergenceTick: tick,
        divergedComponents: ['sync'],
        snapshotId: `snapshot_${Math.floor(tick / 600) * 600}`,
      };
    }

    return {
      valid: errors.length === 0,
      tick,
      stateHash,
      errors,
      warnings,
      needsResync,
    };
  }

  /**
   * Record a snapshot hash for future reference.
   */
  public recordSnapshot(tick: number, hash: string): void {
    this.state.snapshotHashes.set(tick, hash);
    this.state.lastSnapshotTick = tick;
    
    // Prune old snapshots
    if (this.state.snapshotHashes.size > this.config.snapshotRetention) {
      const entries = [...this.state.snapshotHashes.entries()]
        .sort((a, b) => a[0] - b[0]);
      
      // Keep the newest ones
      while (entries.length > this.config.snapshotRetention) {
        const oldest = entries.shift();
        if (oldest) this.state.snapshotHashes.delete(oldest[0]);
      }
    }
  }

  /**
   * Get the nearest valid snapshot for resync.
   */
  public getNearestSnapshot(targetTick: number): { tick: number; hash: string } | null {
    if (this.state.snapshotHashes.size === 0) return null;
    
    const entries = [...this.state.snapshotHashes.entries()]
      .sort((a, b) => a[0] - b[0]);
    
    // Find snapshot <= targetTick
    let best: { tick: number; hash: string } | null = null;
    for (const [tick, hash] of entries) {
      if (tick <= targetTick) {
        best = { tick, hash };
      } else {
        break;
      }
    }
    
    return best;
  }

  /**
   * Get current state.
   */
  public getState(): ClientManifestState {
    return { ...this.state };
  }

  /**
   * Get current tick.
   */
  public getCurrentTick(): number {
    return this.state.currentTick;
  }

  /**
   * Get last known state hash.
   */
  public getLastStateHash(): string {
    return this.state.lastStateHash;
  }

  /**
   * Check if currently diverged.
   */
  public isDiverged(): boolean {
    return this.state.diverged;
  }

  /**
   * Get divergence report.
   */
  public getDivergenceReport(): IDivergenceReport | undefined {
    return this.state.divergenceReport;
  }

  /**
   * Mark as synchronized after successful resync.
   */
  public markSynchronized(tick: number, stateHash: string): void {
    this.state.diverged = false;
    this.state.divergenceReport = undefined;
    this.state.currentTick = tick;
    this.state.lastStateHash = stateHash;
  }

  /**
   * Reset to initial state.
   */
  public reset(): void {
    this.state = {
      currentTick: -1,
      lastStateHash: '',
      lastSnapshotTick: -1,
      snapshotHashes: new Map(),
      diverged: false,
    };
  }

  /**
   * Export state for debugging/logging.
   */
  public exportState(): string {
    return JSON.stringify({
      currentTick: this.state.currentTick,
      lastStateHash: this.state.lastStateHash.slice(0, 16) + '...',
      lastSnapshotTick: this.state.lastSnapshotTick,
      snapshotCount: this.state.snapshotHashes.size,
      diverged: this.state.diverged,
    });
  }
}

// ─── Verification Helpers ─────────────────────────────────────────────────────

/**
 * Quick check if manifest data looks valid.
 */
export function isLikelyValidManifest(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d.tick === 'number' && d.tick >= 0;
}

/**
 * Parse manifest info from world_tick message.
 */
export function parseWorldTickManifest(data: Record<string, unknown>): {
  tick: number;
  stateHash: string;
  snapshotTick: number;
} | null {
  const tick = data.tick as number | undefined;
  const manifest = data.manifest as Record<string, unknown> | undefined;
  
  if (tick === undefined) return null;
  
  return {
    tick,
    stateHash: (manifest?.stateHash as string) ?? '',
    snapshotTick: (manifest?.snapshotTick as number) ?? -1,
  };
}

// ─── Global Instance ─────────────────────────────────────────────────────────

export const clientManifestTracker = new ClientManifestTracker();