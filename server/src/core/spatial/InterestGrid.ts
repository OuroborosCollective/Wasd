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

import type { ChunkKey, EntityId } from '../are/types';
import { chunkContract, getBroadcastChunks } from './UnifiedChunkContract';

/**
 * ObserverInterest: Tracks what chunks an observer is interested in.
 */
export interface ObserverInterest {
  observerId: string;
  position: { x: number; y: number };
  subscribedChunks: Set<ChunkKey>;
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
  private chunkToObservers = new Map<ChunkKey, Set<string>>();
  
  private readonly chunkSize: number;
  private readonly contract = chunkContract;

  constructor(chunkSize: number = 64) {
    this.chunkSize = chunkSize;
  }

  /**
   * Register an observer at a position.
   * Creates subscriptions for all chunks in broadcast range.
   */
  register(observerId: string, position: { x: number; y: number }): void {
    const centerChunk = this.getChunkKey(position.x, position.y);
    const subscribedChunks = new Set(this.contract.getBroadcastChunks(centerChunk));

    this.observers.set(observerId, {
      observerId,
      position,
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
  updatePosition(observerId: string, position: { x: number; y: number }): void {
    const interest = this.observers.get(observerId);
    if (!interest) {
      // Not registered yet - register instead
      this.register(observerId, position);
      return;
    }

    const oldChunk = this.getChunkKey(interest.position.x, interest.position.y);
    const newChunk = this.getChunkKey(position.x, position.y);

    // No change needed if same chunk
    if (oldChunk === newChunk) {
      interest.position = position;
      interest.lastUpdate = Date.now();
      return;
    }

    // Calculate old and new subscription sets
    const oldChunks = this.contract.getBroadcastChunks(oldChunk);
    const newChunks = this.contract.getBroadcastChunks(newChunk);

    // Find chunks to unsubscribe and subscribe
    const toRemove = oldChunks.filter(c => !newChunks.includes(c));
    const toAdd = newChunks.filter(c => !oldChunks.includes(c));

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
    interest.position = position;
    interest.subscribedChunks = new Set(newChunks);
    interest.lastUpdate = Date.now();
  }

  /**
   * Get all observers subscribed to a specific chunk.
   */
  getObserversInChunk(chunkKey: ChunkKey): string[] {
    return Array.from(this.chunkToObservers.get(chunkKey) ?? []);
  }

  /**
   * Get all chunks an observer is subscribed to.
   */
  getSubscribedChunks(observerId: string): ChunkKey[] {
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
   * Compute chunk key from tile coordinates.
   */
  private getChunkKey(tileX: number, tileZ: number): ChunkKey {
    const cx = Math.floor(tileX / this.chunkSize);
    const cz = Math.floor(tileZ / this.chunkSize);
    return `${cx}:${cz}` as ChunkKey;
  }
}

/**
 * Create a new InterestGrid instance.
 */
export function createInterestGrid(chunkSize: number = 64): InterestGrid {
  return new InterestGrid(chunkSize);
}