/**
 * WorldEventBus — central nervous system of the Ouroboros living world.
 *
 * Every module publishes events here; every subscriber reacts.
 * Events feed into WorldHistory, agent memory, heuristic updates,
 * and the legend generator.
 */

export interface WorldEvent {
  id: string;
  type: WorldEventType;
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

let counter = 0;

export class WorldEventBus {
  private handlers = new Map<string, WorldEventHandler[]>();
  private allHandlers: WorldEventHandler[] = [];

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

  /** Publish an event to all subscribers. */
  emit(event: Omit<WorldEvent, "id" | "ts">): WorldEvent {
    const full: WorldEvent = {
      ...event,
      id: `we_${++counter}_${0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */.toString(36)}`,
      ts: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
    };

    const typed = this.handlers.get(full.type);
    if (typed) {
      for (const h of typed) {
        try { h(full); } catch (e) { console.error("[WorldEventBus]", full.type, e); }
      }
    }
    for (const h of this.allHandlers) {
      try { h(full); } catch (e) { console.error("[WorldEventBus:all]", full.type, e); }
    }

    return full;
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
}
