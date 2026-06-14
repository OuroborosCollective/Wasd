import { createARESeed, stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { ActivityMemoryEvent, ActivityMemoryEventType, MemoryBoundsConfig } from "./NPCActivitySnapshot.js";
import { DEFAULT_MEMORY_BOUNDS, generateMemoryEventId } from "./NPCActivitySnapshot.js";

export class BoundedMemoryEventStore {
  private events: ActivityMemoryEvent[] = [];
  private readonly config: MemoryBoundsConfig;
  private eventsThisTick = 0;
  private lastTick = 0;

  constructor(config: MemoryBoundsConfig = DEFAULT_MEMORY_BOUNDS) {
    this.config = config;
  }

  addEvent(entityId: string, tick: number, eventType: ActivityMemoryEventType, data?: Record<string, unknown>): ActivityMemoryEvent | null {
    if (tick !== this.lastTick) {
      this.eventsThisTick = 0;
      this.lastTick = tick;
    }
    if (this.eventsThisTick >= this.config.maxEventsPerTick) return null;
    const event: ActivityMemoryEvent = { id: generateMemoryEventId(entityId, tick, eventType), entityId, tick, eventType, data };
    this.events.push(event);
    this.eventsThisTick++;
    if (this.events.length > this.config.maxEventsPerNPC) this.compact();
    return event;
  }

  addActivityChangeEvent(entityId: string, tick: number, fromActivity: string | undefined, toActivity: string): ActivityMemoryEvent | null {
    return this.addEvent(entityId, tick, "activity_changed", { from: fromActivity, to: toActivity });
  }

  addTargetAcquiredEvent(entityId: string, tick: number, targetId: string): ActivityMemoryEvent | null {
    return this.addEvent(entityId, tick, "target_acquired", { targetId });
  }

  addTargetLostEvent(entityId: string, tick: number, targetId: string): ActivityMemoryEvent | null {
    return this.addEvent(entityId, tick, "target_lost", { targetId });
  }

  getEvents(): readonly ActivityMemoryEvent[] {
    return [...this.events];
  }

  getEventsInRange(fromTick: number, toTick: number): ActivityMemoryEvent[] {
    return this.events.filter((event) => event.tick >= fromTick && event.tick <= toTick);
  }

  getRecentEvents(tickCount: number): ActivityMemoryEvent[] {
    if (this.events.length === 0) return [];
    const minTick = this.events[this.events.length - 1]!.tick - tickCount;
    return this.events.filter((event) => event.tick >= minTick);
  }

  getEventCount(): number {
    return this.events.length;
  }

  isAtCapacity(): boolean {
    return this.events.length >= this.config.maxEventsPerNPC;
  }

  getUtilization(): number {
    return this.events.length / this.config.maxEventsPerNPC;
  }

  clear(): void {
    this.events = [];
    this.eventsThisTick = 0;
    this.lastTick = 0;
  }

  hydrate(events: ActivityMemoryEvent[]): void {
    this.events = [...events].sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id));
    this.lastTick = this.events.at(-1)?.tick ?? 0;
    this.eventsThisTick = 0;
  }

  private compact(): void {
    const targetSize = Math.floor(this.config.maxEventsPerNPC * this.config.compactionThreshold);
    if (this.events.length <= targetSize) return;
    const keepCount = Math.max(Math.floor(this.config.maxEventsPerNPC * 0.5), targetSize);
    this.events = this.events
      .map((event, index) => ({ event, score: this.calculateEventScore(event, index) }))
      .sort((a, b) => b.score - a.score || b.event.tick - a.event.tick || a.event.id.localeCompare(b.event.id))
      .slice(0, keepCount)
      .map((item) => item.event)
      .sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id));
  }

  private calculateEventScore(event: ActivityMemoryEvent, index: number): number {
    let score = Math.max(0, 100 - (this.lastTick - event.tick));
    if (event.eventType === "activity_changed") score += 50;
    if (event.eventType === "target_acquired" || event.eventType === "target_lost") score += 30;
    if (event.eventType === "danger_detected" || event.eventType === "flee_initiated") score += 40;
    if (event.eventType === "work_started" || event.eventType === "work_completed") score += 20;
    if (event.targetId) score += 10;
    score += index * 0.1;
    score += stableHash32(createARESeed([event.id, event.eventType, event.tick, index])) % 10;
    return score;
  }
}

export class MemoryEventManager {
  private stores: Map<string, BoundedMemoryEventStore> = new Map();
  private readonly config: MemoryBoundsConfig;

  constructor(config: MemoryBoundsConfig = DEFAULT_MEMORY_BOUNDS) {
    this.config = config;
  }

  getStore(entityId: string): BoundedMemoryEventStore {
    let store = this.stores.get(entityId);
    if (!store) {
      store = new BoundedMemoryEventStore(this.config);
      this.stores.set(entityId, store);
    }
    return store;
  }

  addEvent(entityId: string, tick: number, eventType: ActivityMemoryEventType, data?: Record<string, unknown>): ActivityMemoryEvent | null {
    return this.getStore(entityId).addEvent(entityId, tick, eventType, data);
  }

  addActivityChangeEvent(entityId: string, tick: number, fromActivity: string | undefined, toActivity: string): ActivityMemoryEvent | null {
    return this.getStore(entityId).addActivityChangeEvent(entityId, tick, fromActivity, toActivity);
  }

  getEvents(entityId: string): readonly ActivityMemoryEvent[] {
    return this.getStore(entityId).getEvents();
  }

  getEventsForEntities(entityIds: string[], fromTick?: number, toTick?: number): ActivityMemoryEvent[] {
    const events: ActivityMemoryEvent[] = [];
    for (const entityId of entityIds) {
      const store = this.stores.get(entityId);
      if (!store) continue;
      events.push(...(fromTick !== undefined && toTick !== undefined ? store.getEventsInRange(fromTick, toTick) : [...store.getEvents()]));
    }
    return events.sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id));
  }

  getEventsForTick(tick: number): ActivityMemoryEvent[] {
    const events: ActivityMemoryEvent[] = [];
    for (const store of this.stores.values()) events.push(...store.getEventsInRange(tick, tick));
    return events.sort((a, b) => a.id.localeCompare(b.id));
  }

  getRecentEvents(tickCount: number): ActivityMemoryEvent[] {
    const events: ActivityMemoryEvent[] = [];
    for (const store of this.stores.values()) events.push(...store.getRecentEvents(tickCount));
    return events.sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id));
  }

  getEntityCount(): number {
    return this.stores.size;
  }

  getTotalEventCount(): number {
    let total = 0;
    for (const store of this.stores.values()) total += store.getEventCount();
    return total;
  }

  clear(): void {
    this.stores.clear();
  }

  clearEntity(entityId: string): void {
    this.stores.delete(entityId);
  }

  getStats(): Record<string, { eventCount: number; utilization: number; isAtCapacity: boolean }> {
    const stats: Record<string, { eventCount: number; utilization: number; isAtCapacity: boolean }> = {};
    for (const [entityId, store] of this.stores) {
      stats[entityId] = { eventCount: store.getEventCount(), utilization: store.getUtilization(), isAtCapacity: store.isAtCapacity() };
    }
    return stats;
  }
}

export const globalMemoryEventManager = new MemoryEventManager();
