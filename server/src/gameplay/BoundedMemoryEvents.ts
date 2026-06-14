/**
 * Bounded Memory Event System - Deterministic Memory with Hard Limits
 * 
 * Provides bounded memory event storage for NPC activity state changes.
 * All operations are deterministic and bounded to prevent memory growth.
 * 
 * Bounds:
 * - Maximum events per NPC
 * - Maximum events per tick per NPC
 * - Deterministic compaction when limits exceeded
 * - No unbounded append-only logs
 */

import { createARESeed, stableHash32 } from "../../core/determinism/AREDeterminism.js";
import type {
  ActivityMemoryEvent,
  ActivityMemoryEventType,
  MemoryBoundsConfig,
} from "./NPCActivitySnapshot.js";
import {
  DEFAULT_MEMORY_BOUNDS,
  generateMemoryEventId,
} from "./NPCActivitySnapshot.js";

// ============================================================================
// Memory Event Store
// ============================================================================

/**
 * Bounded memory event store for a single NPC
 */
export class BoundedMemoryEventStore {
  private events: ActivityMemoryEvent[] = [];
  private readonly config: MemoryBoundsConfig;
  private eventsThisTick: number = 0;
  private lastTick: number = 0;

  constructor(config: MemoryBoundsConfig = DEFAULT_MEMORY_BOUNDS) {
    this.config = config;
  }

  /**
   * Add a memory event with bounds checking
   * Returns the event if added, null if rejected due to bounds
   */
  addEvent(
    entityId: string,
    tick: number,
    eventType: ActivityMemoryEventType,
    data?: Record<string, unknown>
  ): ActivityMemoryEvent | null {
    // Reset per-tick counter if tick changed
    if (tick !== this.lastTick) {
      this.eventsThisTick = 0;
      this.lastTick = tick;
    }

    // Check per-tick limit
    if (this.eventsThisTick >= this.config.maxEventsPerTick) {
      return null; // Rejected due to tick limit
    }

    // Create event
    const event: ActivityMemoryEvent = {
      id: generateMemoryEventId(entityId, tick, eventType),
      entityId,
      tick,
      eventType,
      data,
    };

    // Add to store
    this.events.push(event);
    this.eventsThisTick++;

    // Check global limit and compact if needed
    if (this.events.length > this.config.maxEventsPerNPC) {
      this.compact();
    }

    return event;
  }

  /**
   * Add activity change event with from/to states
   */
  addActivityChangeEvent(
    entityId: string,
    tick: number,
    fromActivity: string | undefined,
    toActivity: string
  ): ActivityMemoryEvent | null {
    return this.addEvent(entityId, tick, "activity_changed", {
      from: fromActivity,
      to: toActivity,
    });
  }

  /**
   * Add target acquired event
   */
  addTargetAcquiredEvent(
    entityId: string,
    tick: number,
    targetId: string
  ): ActivityMemoryEvent | null {
    return this.addEvent(entityId, tick, "target_acquired", {
      targetId,
    });
  }

  /**
   * Add target lost event
   */
  addTargetLostEvent(
    entityId: string,
    tick: number,
    targetId: string
  ): ActivityMemoryEvent | null {
    return this.addEvent(entityId, tick, "target_lost", {
      targetId,
    });
  }

  /**
   * Get all events for this NPC
   */
  getEvents(): readonly ActivityMemoryEvent[] {
    return [...this.events];
  }

  /**
   * Get events within a tick range
   */
  getEventsInRange(
    fromTick: number,
    toTick: number
  ): ActivityMemoryEvent[] {
    return this.events.filter(
      e => e.tick >= fromTick && e.tick <= toTick
    );
  }

  /**
   * Get recent events (last N ticks)
   */
  getRecentEvents(tickCount: number): ActivityMemoryEvent[] {
    if (this.events.length === 0) return [];
    
    const minTick = this.events[this.events.length - 1]!.tick - tickCount;
    return this.events.filter(e => e.tick >= minTick);
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Check if store is at capacity
   */
  isAtCapacity(): boolean {
    return this.events.length >= this.config.maxEventsPerNPC;
  }

  /**
   * Get memory utilization ratio (0-1)
   */
  getUtilization(): number {
    return this.events.length / this.config.maxEventsPerNPC;
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.eventsThisTick = 0;
    this.lastTick = 0;
  }

  /**
   * Hydrate from snapshot
   */
  hydrate(events: ActivityMemoryEvent[]): void {
    this.events = [...events].sort((a, b) => a.tick - b.tick);
    this.lastTick = events.length > 0 
      ? events[events.length - 1]!.tick 
      : 0;
    this.eventsThisTick = 0;
  }

  /**
   * Compact events to stay within bounds
   * Uses deterministic strategy: keep recent + important events
   */
  private compact(): void {
    const targetSize = Math.floor(
      this.config.maxEventsPerNPC * this.config.compactionThreshold
    );

    if (this.events.length <= targetSize) {
      return; // Already below threshold
    }

    // Score each event for keeping
    const scoredEvents = this.events.map((event, index) => ({
      event,
      index,
      score: this.calculateEventScore(event, index),
    }));

    // Sort by score descending (higher = more important to keep)
    scoredEvents.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tie-breaker: keep newer events
      return b.event.tick - a.event.tick;
    });

    // Keep top events
    const keepCount = Math.max(
      Math.floor(this.config.maxEventsPerNPC * 0.5), // Keep at least 50%
      targetSize
    );

    this.events = scoredEvents
      .slice(0, keepCount)
      .sort((a, b) => a.event.tick - b.event.tick); // Re-sort by tick
  }

  /**
   * Calculate event importance score for compaction
   * Deterministic: same event always gets same score
   */
  private calculateEventScore(
    event: ActivityMemoryEvent,
    index: number
  ): number {
    let score = 0;

    // Base score: recency (newer = higher score)
    const ageTicks = this.lastTick - event.tick;
    score += Math.max(0, 100 - ageTicks);

    // Activity change events are high priority
    if (event.eventType === "activity_changed") {
      score += 50;
    }

    // Target events are medium-high priority
    if (event.eventType === "target_acquired" || event.eventType === "target_lost") {
      score += 30;
    }

    // Danger events are high priority
    if (event.eventType === "danger_detected" || event.eventType === "flee_initiated") {
      score += 40;
    }

    // Work events are medium priority
    if (event.eventType === "work_started" || event.eventType === "work_completed") {
      score += 20;
    }

    // Events with target data get boost
    if (event.targetId) {
      score += 10;
    }

    // Position in array (deterministic tie-breaker)
    score += index * 0.1;

    // Use stable hash for final determinism
    const seed = createARESeed([
      event.id,
      event.eventType,
      event.tick,
      index,
    ]);
    score += stableHash32(seed) % 10;

    return score;
  }
}

// ============================================================================
// Global Memory Event Manager
// ============================================================================

/**
 * Global manager for all NPC memory events
 * Provides batch operations and cross-NPC queries
 */
export class MemoryEventManager {
  private stores: Map<string, BoundedMemoryEventStore> = new Map();
  private readonly config: MemoryBoundsConfig;

  constructor(config: MemoryBoundsConfig = DEFAULT_MEMORY_BOUNDS) {
    this.config = config;
  }

  /**
   * Get or create store for entity
   */
  getStore(entityId: string): BoundedMemoryEventStore {
    let store = this.stores.get(entityId);
    if (!store) {
      store = new BoundedMemoryEventStore(this.config);
      this.stores.set(entityId, store);
    }
    return store;
  }

  /**
   * Add event for entity
   */
  addEvent(
    entityId: string,
    tick: number,
    eventType: ActivityMemoryEventType,
    data?: Record<string, unknown>
  ): ActivityMemoryEvent | null {
    return this.getStore(entityId).addEvent(entityId, tick, eventType, data);
  }

  /**
   * Add activity change event
   */
  addActivityChangeEvent(
    entityId: string,
    tick: number,
    fromActivity: string | undefined,
    toActivity: string
  ): ActivityMemoryEvent | null {
    return this.getStore(entityId).addActivityChangeEvent(
      entityId,
      tick,
      fromActivity,
      toActivity
    );
  }

  /**
   * Get all events for entity
   */
  getEvents(entityId: string): readonly ActivityMemoryEvent[] {
    return this.getStore(entityId).getEvents();
  }

  /**
   * Get events for multiple entities
   */
  getEventsForEntities(
    entityIds: string[],
    fromTick?: number,
    toTick?: number
  ): ActivityMemoryEvent[] {
    const events: ActivityMemoryEvent[] = [];
    
    for (const entityId of entityIds) {
      const store = this.stores.get(entityId);
      if (store) {
        const entityEvents = fromTick !== undefined && toTick !== undefined
          ? store.getEventsInRange(fromTick, toTick)
          : [...store.getEvents()];
        events.push(...entityEvents);
      }
    }

    // Sort by tick for consistent output
    return events.sort((a, b) => a.tick - b.tick);
  }

  /**
   * Get all events for tick
   */
  getEventsForTick(tick: number): ActivityMemoryEvent[] {
    const events: ActivityMemoryEvent[] = [];
    
    for (const store of this.stores.values()) {
      events.push(...store.getEventsInRange(tick, tick));
    }

    return events;
  }

  /**
   * Get recent events across all entities
   */
  getRecentEvents(tickCount: number): ActivityMemoryEvent[] {
    const events: ActivityMemoryEvent[] = [];
    
    for (const store of this.stores.values()) {
      events.push(...store.getRecentEvents(tickCount));
    }

    return events.sort((a, b) => a.tick - b.tick);
  }

  /**
   * Get entity count
   */
  getEntityCount(): number {
    return this.stores.size;
  }

  /**
   * Get total event count
   */
  getTotalEventCount(): number {
    let total = 0;
    for (const store of this.stores.values()) {
      total += store.getEventCount();
    }
    return total;
  }

  /**
   * Clear all memory
   */
  clear(): void {
    this.stores.clear();
  }

  /**
   * Clear memory for specific entity
   */
  clearEntity(entityId: string): void {
    this.stores.delete(entityId);
  }

  /**
   * Get stats for all stores
   */
  getStats(): Record<string, {
    eventCount: number;
    utilization: number;
    isAtCapacity: boolean;
  }> {
    const stats: Record<string, {
      eventCount: number;
      utilization: number;
      isAtCapacity: boolean;
    }> = {};

    for (const [entityId, store] of this.stores) {
      stats[entityId] = {
        eventCount: store.getEventCount(),
        utilization: store.getUtilization(),
        isAtCapacity: store.isAtCapacity(),
      };
    }

    return stats;
  }

  /**
   * Hydrate from snapshot
   */
  hydrate(snapshot: Map<string, ActivityMemoryEvent[]>): void {
    this.stores.clear();
    
    for (const [entityId, events] of snapshot) {
      const store = new BoundedMemoryEventStore(this.config);
      store.hydrate(events);
      this.stores.set(entityId, store);
    }
  }

  /**
   * Export to snapshot
   */
  export(): Map<string, ActivityMemoryEvent[]> {
    const snapshot = new Map<string, ActivityMemoryEvent[]>();
    
    for (const [entityId, store] of this.stores) {
      snapshot.set(entityId, [...store.getEvents()]);
    }

    return snapshot;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const globalMemoryEventManager = new MemoryEventManager();