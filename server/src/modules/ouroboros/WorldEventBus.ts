/**
 * WorldEventBus — central nervous system of the Ouroboros living world.
 *
 * Every module publishes events here; every subscriber reacts.
 * Events feed into WorldHistory, agent memory, heuristic updates,
 * and the legend generator.
 *
 * ARE Determinism: Events can be created with deterministic IDs using
 * createDeterministicEvent(). This requires tick context to be passed.
 * The legacy emit() method still works but uses placeholder values.
 */

import {
  createDeterministicEvent,
  type DeterministicEventContext,
  type WorldEventInput,
} from "../../core/are/DeterministicEventFactory.js";

export interface WorldEvent {
  id: string;
  type: WorldEventType;
  /** Logical time in milliseconds (tick * 100). NOT wall-clock time. */
  ts: number;
  /** Position where the event occurred. */
  position: { x: number; y: number };
  /** Primary actor (agent/player/faction who caused the event). */
  actorId: string;
  actorName: string;
  /** Optional target. */
  targetId?: string;
  targetName?: string;
  /** Freeform data bag — contents vary by type. */
  data: Record<string, unknown>;
  /** 0..1 emotional intensity — drives memory weight + legend eligibility. */
  intensity: number;
  /** Region/zone where event happened (derived from position). */
  regionId?: string;
}

export type WorldEventType =
  | "combat_hit"
  | "combat_kill"
  | "trade_complete"
  | "trade_failed"
  | "item_crafted"
  | "quest_completed"
  | "level_up"
  | "faction_formed"
  | "faction_joined"
  | "faction_left"
  | "alliance_formed"
  | "war_declared"
  | "peace_treaty"
  | "npc_chat"
  | "npc_migrate"
  | "npc_goal_changed"
  | "market_price_shift"
  | "scarcity_event"
  | "legend_created"
  | "legend_spread"
  | "family_formed"
  | "agent_born"
  | "agent_died"
  | "player_chat"
  | "world_tick"
  | "oracle_prophecy"
  | "oracle_critical"
  | "oracle_recommendation";

export type WorldEventHandler = (event: WorldEvent) => void;

let legacyCounter = 0;

export class WorldEventBus {
  private handlers = new Map<string, WorldEventHandler[]>();
  private allHandlers: WorldEventHandler[] = [];
  /** Per-tick event indices for deterministic localIndex assignment */
  private tickEventIndices = new Map<number, number>();

  /** Subscribe to a specific event type. */
  on(type: WorldEventType, handler: WorldEventHandler): () => void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
    return () => {
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    };
  }

  /** Subscribe to ALL events. */
  onAll(handler: WorldEventHandler): () => void {
    this.allHandlers.push(handler);
    return () => {
      const idx = this.allHandlers.indexOf(handler);
      if (idx >= 0) this.allHandlers.splice(idx, 1);
    };
  }

  /**
   * Create a deterministic event with proper tick context.
   * Use this method when you have tick information available.
   *
   * @param input Event input data
   * @param context Tick context with tick and optional stateHash
   * @param position Event position
   * @param actorName Actor display name
   * @param intensity Event intensity (0-1)
   * @param target Optional target info
   */
  createEvent<TData = Record<string, unknown>>(
    input: WorldEventInput<TData>,
    context: DeterministicEventContext,
    position: { x: number; y: number },
    actorName: string,
    intensity = 0.5,
    target?: { id: string; name: string },
  ): WorldEvent {
    const deterministic = createDeterministicEvent(input, context);

    const full: WorldEvent = {
      id: deterministic.id,
      type: input.type as WorldEventType,
      ts: deterministic.logicalTimeMs,
      position,
      actorId: deterministic.actorId,
      actorName,
      targetId: target?.id ?? (deterministic.targetId || undefined),
      targetName: target?.name,
      data: deterministic.data as Record<string, unknown>,
      intensity,
    };

    this.dispatch(full);
    return full;
  }

  /**
   * Publish an event to all subscribers.
   *
   * DEPRECATED: This method uses placeholder values for id and ts.
   * Use createEvent() with proper tick context instead.
   *
   * @deprecated Use createEvent() with DeterministicEventContext
   */
  emit(event: Omit<WorldEvent, "id" | "ts">): WorldEvent {
    const full: WorldEvent = {
      ...event,
      id: `legacy_${++legacyCounter}_0`,
      ts: 0, // Legacy placeholder - use createEvent() for proper ts
    };

    this.dispatch(full);
    return full;
  }

  private dispatch(full: WorldEvent): void {
    const typed = this.handlers.get(full.type);
    if (typed) {
      for (const h of typed) {
        try { h(full); } catch (e) { console.error("[WorldEventBus]", full.type, e); }
      }
    }
    for (const h of this.allHandlers) {
      try { h(full); } catch (e) { console.error("[WorldEventBus:all]", full.type, e); }
    }
  }

  /** Helper: create a typed event with minimal boilerplate. */
  static create(
    type: WorldEventType,
    actorId: string,
    actorName: string,
    position: { x: number; y: number },
    data: Record<string, unknown> = {},
    intensity = 0.5,
    target?: { id: string; name: string },
  ): Omit<WorldEvent, "id" | "ts"> {
    return {
      type,
      actorId,
      actorName,
      position,
      data,
      intensity,
      targetId: target?.id,
      targetName: target?.name,
    };
  }

  /** Get next local index for a given tick (for deterministic event ordering) */
  getNextLocalIndex(tick: number): number {
    const current = this.tickEventIndices.get(tick) ?? -1;
    const next = current + 1;
    this.tickEventIndices.set(tick, next);
    return next;
  }

  /** Reset tick event indices (useful for testing) */
  resetTickIndices(): void {
    this.tickEventIndices.clear();
  }
}
