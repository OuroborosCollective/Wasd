/**
 * WorldEventBus.ts - Phase 11: Ouroboros Tick System Integration
 * 
 * World Event Bus with AxiomaticEventBus integration.
 * Uses TickSystemContextProvider for deterministic event publishing.
 */

import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";

export interface WorldEvent {
  type: string;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  position?: { x: number; y: number };
  data?: Record<string, any>;
  intensity?: number;
  timestamp?: number;
  tickId?: number;
}

export interface WorldEventSubscription {
  id: string;
  eventTypes: Set<string>;
  callback: (event: WorldEvent) => void;
  tickContext?: boolean;
}

/**
 * WorldEventBus - Deterministic event bus with Ouroboros integration
 * 
 * Ouroboros cycle publishes events through this bus for:
 * - PERCEIVE: World state changes
 * - EVALUATE: NPC decisions
 * - ACT: Action events
 * - REMEMBER: Memory updates
 * - UPDATE: State synchronization
 */
export class WorldEventBus {
  private static instance: WorldEventBus | null = null;
  
  private subscriptions: Map<string, WorldEventSubscription> = new Map();
  private eventHistory: WorldEvent[] = [];
  private maxHistorySize = 1000;
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): WorldEventBus {
    if (!WorldEventBus.instance) {
      WorldEventBus.instance = new WorldEventBus();
    }
    return WorldEventBus.instance;
  }
  
  /**
   * Publish a world event with deterministic tick context
   */
  publish(event: string, data: any): void {
    const tickContext = tickContextProvider.getContext();
    
    const worldEvent: WorldEvent = {
      type: event,
      data,
      timestamp: tickContext.tickTimestamp,
      tickId: tickContext.tickId,
    };
    
    // Add to history
    this.eventHistory.push(worldEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    // Notify subscribers
    this.notifySubscribers(worldEvent);
    
    console.log(`[WorldEventBus] ${event}`, data);
  }
  
  /**
   * Publish with full event details
   */
  publishEvent(event: WorldEvent): void {
    const tickContext = tickContextProvider.getContext();
    
    // Ensure tick context is set
    event.tickId = event.tickId ?? tickContext.tickId;
    event.timestamp = event.timestamp ?? tickContext.tickTimestamp;
    
    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    // Notify subscribers
    this.notifySubscribers(event);
  }
  
  /**
   * Subscribe to event types
   */
  subscribe(
    id: string,
    eventTypes: string[],
    callback: (event: WorldEvent) => void,
    includeTickContext = false
  ): void {
    const subscription: WorldEventSubscription = {
      id,
      eventTypes: new Set(eventTypes),
      callback,
      tickContext: includeTickContext,
    };
    
    this.subscriptions.set(id, subscription);
  }
  
  /**
   * Unsubscribe from events
   */
  unsubscribe(id: string): void {
    this.subscriptions.delete(id);
  }
  
  /**
   * Get event history
   */
  getHistory(limit?: number): WorldEvent[] {
    if (limit) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }
  
  /**
   * Get events by type
   */
  getEventsByType(eventType: string, limit?: number): WorldEvent[] {
    const events = this.eventHistory.filter((e) => e.type === eventType);
    return limit ? events.slice(-limit) : events;
  }
  
  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }
  
  /**
   * Notify subscribers of an event
   */
  private notifySubscribers(event: WorldEvent): void {
    for (const [, subscription] of this.subscriptions) {
      if (subscription.eventTypes.has(event.type)) {
        try {
          subscription.callback(event);
        } catch (error) {
          console.error(`[WorldEventBus] Subscription ${subscription.id} error:`, error);
        }
      }
    }
  }
  
  /**
   * Get current tick context
   */
  getTickContext() {
    return tickContextProvider.getContext();
  }
  
  /**
   * Get event count
   */
  getEventCount(): number {
    return this.eventHistory.length;
  }
  
  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscriptions.size;
  }
}