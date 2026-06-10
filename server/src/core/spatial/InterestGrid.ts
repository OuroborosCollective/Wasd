/**
 * ARELORIA CORE: Interest Grid
 * 
 * Manages the mapping between observers (players) and the chunks they are
 * interested in. This enables efficient spatial queries for:
 * 
 * - Determining which players should receive updates about an entity
 * - Finding all entities in a chunk that an observer cares about
 * - Tracking chunk subscriptions as players move
 * 
 * The InterestGrid decouples observers from the spatial grid, allowing
 * for efficient broadcast targeting.
 */

import type { ChunkKey } from '../are/types';
import { UNIFIED_CHUNK_CONTRACT } from './UnifiedChunkContract';
import { tileToChunkCoord, getChunkKey } from './ChunkMath';
import type { ChunkCoord } from '../are/types';

/**
 * ObserverInterest: Tracks what chunks an observer is interested in.
 */
export interface ObserverInterest {
  observerId: string;
  tileX: number;
  tileY: number;
  subscribedChunks: Set<string>;
  lastUpdate: number;
}

/**
 * InterestGrid: Maps observers to their subscribed chunks.
 * 
 * Provides O(1) lookup for:
 * - Finding all chunks an observer subscribes to
 * - Finding all observers subscribed to a chunk
 */
export class InterestGrid {
  // Map<observerId, ObserverInterest>
  private observers = new Map<string, ObserverInterest>();
  
  // Map<chunkKey, Set<observerId>> - reverse index for efficient chunk-to-observer lookup
  private chunkToObservers = new Map<string, Set<string>>();
  
  private readonly contract = UNIFIED_CHUNK_CONTRACT;

  constructor() {
  }

  /**
   * Register an observer at a position.
   * Creates subscriptions for all chunks in broadcast range.
   */
  register(observerId: string, tileX: number, tileY: number): void {
    const cx = tileToChunkCoord(tileX);
    const cy = tileToChunkCoord(tileY);
    const subscribedChunks = new Set(this.getChunksInRadius(cx, cy, this.contract.broadcastRadiusChunks));

    this.observers.set(observerId, {
      observerId,
      tileX,
      tileY,
      subscribedChunks,
      lastUpdate: Date.now()
    });

    // Update reverse index
    for (const chunk of subscribedChunks) {
      if (!this.chunkToObservers.has(chunk)) {
        this.chunkToObservers.set(chunk, new Set());
      }
      this.chunkToObservers.get(chunk)!.add(observerId);
    }
  }

  /**
   * Unregister an observer, removing all their subscriptions.
   */
  unregister(observerId: string): void {
    const interest = this.observers.get(observerId);
    if (!interest) return;

    // Remove from reverse index
    for (const chunk of interest.subscribedChunks) {
      this.chunkToObservers.get(chunk)?.delete(observerId);
      if (this.chunkToObservers.get(chunk)?.size === 0) {
        this.chunkToObservers.delete(chunk);
      }
    }

    this.observers.delete(observerId);
  }

  /**
   * Update an observer's position.
   * Automatically handles chunk subscription changes.
   */
  updatePosition(observerId: string, tileX: number, tileY: number): void {
    const interest = this.observers.get(observerId);
    if (!interest) {
      // Not registered yet - register instead
      this.register(observerId, tileX, tileY);
      return;
    }

    const oldCx = tileToChunkCoord(interest.tileX);
    const oldCy = tileToChunkCoord(interest.tileY);
    const newCx = tileToChunkCoord(tileX);
    const newCy = tileToChunkCoord(tileY);

    // No change needed if same chunk
    if (oldCx === newCx && oldCy === newCy) {
      interest.tileX = tileX;
      interest.tileY = tileY;
      interest.lastUpdate = Date.now();
      return;
    }

    // Calculate old and new subscription sets
    const oldChunks = this.getChunksInRadius(oldCx, oldCy, this.contract.broadcastRadiusChunks);
    const newChunks = this.getChunksInRadius(newCx, newCy, this.contract.broadcastRadiusChunks);

    // Find chunks to unsubscribe and subscribe
    const toRemove = oldChunks.filter(c => !new Set(newChunks).has(c));
    const toAdd = newChunks.filter(c => !new Set(oldChunks).has(c));

    // Update reverse index
    for (const chunk of toRemove) {
      this.chunkToObservers.get(chunk)?.delete(observerId);
      if (this.chunkToObservers.get(chunk)?.size === 0) {
        this.chunkToObservers.delete(chunk);
      }
    }

    for (const chunk of toAdd) {
      if (!this.chunkToObservers.has(chunk)) {
        this.chunkToObservers.set(chunk, new Set());
      }
      this.chunkToObservers.get(chunk)!.add(observerId);
    }

    // Update interest
    interest.tileX = tileX;
    interest.tileY = tileY;
    interest.subscribedChunks = new Set(newChunks);
    interest.lastUpdate = Date.now();
  }

  /**
   * Get all observers subscribed to a specific chunk.
   */
  getObserversInChunk(chunkKey: string): string[] {
    return Array.from(this.chunkToObservers.get(chunkKey) ?? []);
  }

  /**
   * Get all chunks an observer is subscribed to.
   */
  getSubscribedChunks(observerId: string): string[] {
    const interest = this.observers.get(observerId);
    return interest ? Array.from(interest.subscribedChunks) : [];
  }

  /**
   * Get all observers (for broadcasting to all).
   */
  getAllObservers(): string[] {
    return Array.from(this.observers.keys());
  }

  /**
   * Check if an observer is registered.
   */
  hasObserver(observerId: string): boolean {
    return this.observers.has(observerId);
  }

  /**
   * Get observer interest data.
   */
  getObserverInterest(observerId: string): ObserverInterest | undefined {
    return this.observers.get(observerId);
  }

  /**
   * Get the total number of observers.
   */
  getObserverCount(): number {
    return this.observers.size;
  }

  /**
   * Get the number of chunks with active subscriptions.
   */
  getActiveChunkCount(): number {
    return this.chunkToObservers.size;
  }

  /**
   * Clear all observers and subscriptions.
   */
  clear(): void {
    this.observers.clear();
    this.chunkToObservers.clear();
  }

  /**
   * Get all chunks in a radius around a center chunk.
   */
  private getChunksInRadius(cx: ChunkCoord, cy: ChunkCoord, radius: number): string[] {
    const keys: string[] = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const nc = (Number(cx) + dx) as ChunkCoord;
        const ny = (Number(cy) + dy) as ChunkCoord;
        keys.push(getChunkKey(nc, ny));
      }
    }
    return keys;
  }
}

/**
 * Create a new InterestGrid instance.
 */
export function createInterestGrid(): InterestGrid {
  return new InterestGrid();
}