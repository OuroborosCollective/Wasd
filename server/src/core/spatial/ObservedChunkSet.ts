/**
 * ARELORIA CORE: Observed Chunk Set
 * 
 * Tracks changes in chunk observation over time.
 * Used to:
 * 
 * - Detect which chunks an observer started or stopped observing
 * - Optimize network updates by only sending changed chunks
 * - Track chunk "enter" and "exit" events for an observer
 * 
 * This enables efficient delta-based chunk updates rather than
 * sending full chunk state every tick.
 */

import type { ChunkKey } from '../are/types';

/**
 * ChunkDelta: Represents a change in chunk observation.
 */
export interface ChunkDelta {
  /** Chunks that became visible */
  added: ChunkKey[];
  /** Chunks that are no longer visible */
  removed: ChunkKey[];
  /** Chunks that remain visible */
  stable: ChunkKey[];
}

/**
 * ObservedChunkSet: Tracks observed chunks with delta detection.
 * 
 * Maintains the current set of observed chunks and can compute
 * the difference from a previous state.
 */
export class ObservedChunkSet {
  private currentChunks: Set<ChunkKey> = new Set();
  private previousChunks: Set<ChunkKey> = new Set();
  private dirty = false;

  /**
   * Update the observed chunks.
   * Returns the delta from the previous state.
   */
  update(newChunks: ChunkKey[]): ChunkDelta {
    // Save current as previous
    this.previousChunks = new Set(this.currentChunks);
    
    // Set new current
    this.currentChunks = new Set(newChunks);
    this.dirty = true;

    // Compute delta
    const added: ChunkKey[] = [];
    const removed: ChunkKey[] = [];
    const stable: ChunkKey[] = [];

    for (const chunk of newChunks) {
      if (this.previousChunks.has(chunk)) {
        stable.push(chunk);
      } else {
        added.push(chunk);
      }
    }

    for (const chunk of this.previousChunks) {
      if (!this.currentChunks.has(chunk)) {
        removed.push(chunk);
      }
    }

    return { added, removed, stable };
  }

  /**
   * Get the current set of observed chunks.
   */
  getCurrent(): ChunkKey[] {
    return Array.from(this.currentChunks);
  }

  /**
   * Get the previous set of observed chunks (before last update).
   */
  getPrevious(): ChunkKey[] {
    return Array.from(this.previousChunks);
  }

  /**
   * Check if a specific chunk is currently observed.
   */
  has(chunk: ChunkKey): boolean {
    return this.currentChunks.has(chunk);
  }

  /**
   * Get the count of currently observed chunks.
   */
  size(): number {
    return this.currentChunks.size;
  }

  /**
   * Check if there were any changes since the last update.
   */
  hasChanges(): boolean {
    if (!this.dirty) return false;
    return this.currentChunks.size !== this.previousChunks.size ||
           Array.from(this.currentChunks).some(c => !this.previousChunks.has(c));
  }

  /**
   * Clear the dirty flag without updating state.
   */
  markClean(): void {
    this.dirty = false;
  }

  /**
   * Clear all tracked chunks.
   */
  clear(): void {
    this.previousChunks = new Set(this.currentChunks);
    this.currentChunks.clear();
    this.dirty = true;
  }

  /**
   * Get chunks that are in the current set but not in the previous.
   */
  getAdded(): ChunkKey[] {
    const added: ChunkKey[] = [];
    for (const chunk of this.currentChunks) {
      if (!this.previousChunks.has(chunk)) {
        added.push(chunk);
      }
    }
    return added;
  }

  /**
   * Get chunks that are in the previous set but not in the current.
   */
  getRemoved(): ChunkKey[] {
    const removed: ChunkKey[] = [];
    for (const chunk of this.previousChunks) {
      if (!this.currentChunks.has(chunk)) {
        removed.push(chunk);
      }
    }
    return removed;
  }

  /**
   * Get chunks that are in both current and previous sets.
   */
  getStable(): ChunkKey[] {
    const stable: ChunkKey[] = [];
    for (const chunk of this.currentChunks) {
      if (this.previousChunks.has(chunk)) {
        stable.push(chunk);
      }
    }
    return stable;
  }

  /**
   * Snapshot the current state for later comparison.
   * This allows multiple updates before checking changes.
   */
  snapshot(): Set<ChunkKey> {
    return new Set(this.currentChunks);
  }

  /**
   * Restore from a snapshot.
   */
  restore(snapshot: Set<ChunkKey>): void {
    this.previousChunks = this.currentChunks;
    this.currentChunks = new Set(snapshot);
    this.dirty = true;
  }
}

/**
 * ChunkSetFactory: Creates pre-configured ObservedChunkSet instances.
 */
export class ChunkSetFactory {
  /**
   * Create an empty observed chunk set.
   */
  static create(): ObservedChunkSet {
    return new ObservedChunkSet();
  }

  /**
   * Create an observed chunk set with initial chunks.
   */
  static createWithChunks(chunks: ChunkKey[]): ObservedChunkSet {
    const set = new ObservedChunkSet();
    set.update(chunks);
    return set;
  }
}

/**
 * Diff two sets of chunks and return the delta.
 */
export function diffChunks(before: ChunkKey[], after: ChunkKey[]): ChunkDelta {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  
  const added: ChunkKey[] = [];
  const removed: ChunkKey[] = [];
  const stable: ChunkKey[] = [];

  for (const chunk of afterSet) {
    if (beforeSet.has(chunk)) {
      stable.push(chunk);
    } else {
      added.push(chunk);
    }
  }

  for (const chunk of beforeSet) {
    if (!afterSet.has(chunk)) {
      removed.push(chunk);
    }
  }

  return { added, removed, stable };
}