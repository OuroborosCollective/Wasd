/**
 * NPCObservationBus — Central Event System for NPC Observations
 * 
 * All game systems emit events through this bus. NPCs can subscribe to
 * relevant event types and receive observations into their memory.
 * 
 * Design principles:
 * - Deterministic observation IDs using stable hash
 * - Event filtering by NPC relevance criteria
 * - Type-safe event emission from any game system
 * 
 * Usage:
 *   npcObservationBus.emit({ type: "player_attack", actorId: playerId, targetId: npcId, ... });
 *   npcObservationBus.subscribe("player_attack", (obs) => npcMemory.addObservation(obs));
 */

import { stableHash32 } from "../../../core/determinism/AREDeterminism.js";
import type { 
  NPCObservation, 
  WorldMemoryEventType,
  NPCMemoryV3 
} from "./NPCMemoryV3.js";

// ============================================================================
// Observation Bus Core
// ============================================================================

export type ObservationFilter = {
  npcId?: string;
  regionId?: string;
  factionId?: string;
  type?: WorldMemoryEventType;
  actorId?: string;
  targetId?: string;
};

export type ObservationCallback = (observation: NPCObservation) => void;

export class NPCObservationBus {
  private observers: Map<WorldMemoryEventType, Set<ObservationCallback>> = new Map();
  private globalObservers: Set<ObservationCallback> = new Set();
  private observationHistory: NPCObservation[] = [];
  private maxHistorySize = 10000;

  constructor() {
    // Initialize all event type channels
    const eventTypes: WorldMemoryEventType[] = [
      "player_attack", "player_help", "player_trade", "npc_death", "npc_birth",
      "resource_shortage", "market_price_shift", "city_tax_changed", "guild_declared_war",
      "king_elected", "building_destroyed", "building_constructed", "quest_completed",
      "quest_failed", "quest_started", "weather_disaster", "dungeon_opened", "dungeon_closed",
      "boss_spawned", "boss_defeated", "caravan_raided", "caravan_arrived", "law_changed",
      "territory_claimed", "faction_joined", "faction_left", "item_stolen", "item_gifted",
      "combat_won", "combat_lost", "social_greeting", "social_argument", 
      "crafting_completed", "exploration_discovered",
    ];

    for (const type of eventTypes) {
      this.observers.set(type, new Set());
    }
  }

  /**
   * Generate deterministic observation ID
   */
  private generateObservationId(
    tick: number,
    type: WorldMemoryEventType,
    actorId?: string,
    targetId?: string
  ): string {
    const components = [tick.toString(), type, actorId ?? "", targetId ?? ""];
    const hash = stableHash32(components.join("|"));
    return `obs_${hash.toString(16)}`;
  }

  /**
   * Emit an observation event from any game system
   */
  emit(
    type: WorldMemoryEventType,
    tick: number,
    data: {
      actorId?: string;
      actorName?: string;
      targetId?: string;
      targetName?: string;
      regionId?: string;
      cityId?: string;
      factionId?: string;
      guildId?: string;
      impact?: number;
      tags?: string[];
      payload?: Record<string, string | number | boolean>;
    }
  ): NPCObservation {
    const observation: NPCObservation = {
      id: this.generateObservationId(tick, type, data.actorId, data.targetId),
      tick,
      type,
      actorId: data.actorId,
      actorName: data.actorName,
      targetId: data.targetId,
      targetName: data.targetName,
      regionId: data.regionId,
      cityId: data.cityId,
      factionId: data.factionId,
      guildId: data.guildId,
      impact: data.impact ?? 0,
      tags: data.tags ?? [],
      payload: data.payload ?? {},
    };

    // Store in history
    this.observationHistory.push(observation);
    if (this.observationHistory.length > this.maxHistorySize) {
      this.observationHistory.shift();
    }

    // Notify type-specific observers
    const typeObservers = this.observers.get(type);
    if (typeObservers) {
      for (const callback of typeObservers) {
        try {
          callback(observation);
        } catch (err) {
          console.error(`[NPCObservationBus] Observer error for ${type}:`, err);
        }
      }
    }

    // Notify global observers
    for (const callback of this.globalObservers) {
      try {
        callback(observation);
      } catch (err) {
        console.error("[NPCObservationBus] Global observer error:", err);
      }
    }

    return observation;
  }

  /**
   * Subscribe to specific event type
   */
  subscribe(type: WorldMemoryEventType, callback: ObservationCallback): () => void {
    const observers = this.observers.get(type);
    if (observers) {
      observers.add(callback);
    }
    return () => this.unsubscribe(type, callback);
  }

  /**
   * Subscribe to all event types
   */
  subscribeAll(callback: ObservationCallback): () => void {
    this.globalObservers.add(callback);
    return () => this.globalObservers.delete(callback);
  }

  /**
   * Unsubscribe from specific event type
   */
  unsubscribe(type: WorldMemoryEventType, callback: ObservationCallback): void {
    const observers = this.observers.get(type);
    if (observers) {
      observers.delete(callback);
    }
  }

  /**
   * Get observations for a specific NPC (filtered by relevance)
   */
  getObservationsForNPC(
    npcId: string,
    npcMemory: NPCMemoryV3,
    filter?: ObservationFilter
  ): NPCObservation[] {
    return this.observationHistory.filter((obs) => {
      // Type filter
      if (filter?.type && obs.type !== filter.type) return false;
      
      // Actor filter
      if (filter?.actorId && obs.actorId !== filter.actorId) return false;
      
      // Target filter
      if (filter?.targetId && obs.targetId !== filter.targetId) return false;
      
      // Region filter
      if (filter?.regionId && obs.regionId !== filter.regionId) return false;
      
      // NPC is actor
      if (obs.actorId === npcId) return true;
      
      // NPC is target
      if (obs.targetId === npcId) return true;
      
      // NPC's home region
      if (obs.regionId === npcMemory.identity.homeRegionId) return true;
      
      // NPC's faction
      if (obs.factionId && obs.factionId === npcMemory.faction.factionId) return true;
      
      // NPC is nearby (within same city/region context)
      if (obs.cityId && npcMemory.identity.homeCityId === obs.cityId) return true;
      
      return false;
    });
  }

  /**
   * Get recent observations by type
   */
  getRecentObservations(type: WorldMemoryEventType, count: number = 10): NPCObservation[] {
    return this.observationHistory
      .filter((obs) => obs.type === type)
      .slice(-count);
  }

  /**
   * Get all observations in time range
   */
  getObservationsInRange(startTick: number, endTick: number): NPCObservation[] {
    return this.observationHistory.filter(
      (obs) => obs.tick >= startTick && obs.tick <= endTick
    );
  }

  /**
   * Get observation statistics
   */
  getStats(): {
    totalObservations: number;
    byType: Record<string, number>;
    historySize: number;
  } {
    const byType: Record<string, number> = {};
    for (const obs of this.observationHistory) {
      byType[obs.type] = (byType[obs.type] ?? 0) + 1;
    }
    return {
      totalObservations: this.observationHistory.length,
      byType,
      historySize: this.observationHistory.length,
    };
  }

  /**
   * Clear observation history
   */
  clearHistory(): void {
    this.observationHistory = [];
  }
}

// ============================================================================
// Pre-built Event Emitters for Common Game Systems
// ============================================================================

/**
 * Combat event emitter helper
 */
export function emitCombatEvent(
  bus: NPCObservationBus,
  tick: number,
  event: "player_attack" | "combat_won" | "combat_lost" | "npc_death",
  data: {
    actorId: string;
    actorName?: string;
    targetId: string;
    targetName?: string;
    regionId?: string;
    damage?: number;
    weaponType?: string;
  }
): NPCObservation {
  return bus.emit(event, tick, {
    actorId: data.actorId,
    actorName: data.actorName,
    targetId: data.targetId,
    targetName: data.targetName,
    regionId: data.regionId,
    impact: event === "player_attack" ? -8 : event === "combat_won" ? 5 : -5,
    tags: ["combat", "danger", ...(data.weaponType ? [data.weaponType] : [])],
    payload: {
      damage: data.damage ?? 0,
      weaponType: data.weaponType ?? "unknown",
    },
  });
}

/**
 * Trade event emitter helper
 */
export function emitTradeEvent(
  bus: NPCObservationBus,
  tick: number,
  event: "player_trade" | "market_price_shift",
  data: {
    actorId?: string;
    targetId?: string;
    regionId?: string;
    goods?: string;
    price?: number;
    quantity?: number;
  }
): NPCObservation {
  return bus.emit(event, tick, {
    actorId: data.actorId,
    targetId: data.targetId,
    regionId: data.regionId,
    impact: event === "player_trade" ? 3 : 0,
    tags: ["trade", "economy", ...(data.goods ? [data.goods] : [])],
    payload: {
      goods: data.goods ?? "unknown",
      price: data.price ?? 0,
      quantity: data.quantity ?? 0,
    },
  });
}

/**
 * Quest event emitter helper
 */
export function emitQuestEvent(
  bus: NPCObservationBus,
  tick: number,
  event: "quest_completed" | "quest_failed" | "quest_started",
  data: {
    actorId: string;
    targetId?: string;
    questId?: string;
    questName?: string;
    regionId?: string;
    reward?: number;
  }
): NPCObservation {
  return bus.emit(event, tick, {
    actorId: data.actorId,
    targetId: data.targetId,
    regionId: data.regionId,
    impact: event === "quest_completed" ? 6 : event === "quest_failed" ? -3 : 1,
    tags: ["quest", "adventure"],
    payload: {
      questId: data.questId ?? "unknown",
      questName: data.questName ?? "Unknown Quest",
      reward: data.reward ?? 0,
    },
  });
}

/**
 * Faction event emitter helper
 */
export function emitFactionEvent(
  bus: NPCObservationBus,
  tick: number,
  event: "faction_joined" | "faction_left" | "guild_declared_war",
  data: {
    actorId: string;
    factionId: string;
    factionName?: string;
    regionId?: string;
  }
): NPCObservation {
  return bus.emit(event, tick, {
    actorId: data.actorId,
    factionId: data.factionId,
    regionId: data.regionId,
    impact: event === "faction_joined" ? 4 : event === "faction_left" ? -2 : -6,
    tags: ["faction", "politics"],
    payload: {
      factionName: data.factionName ?? data.factionId,
    },
  });
}

/**
 * Economy event emitter helper
 */
export function emitEconomyEvent(
  bus: NPCObservationBus,
  tick: number,
  event: "resource_shortage" | "caravan_raided" | "caravan_arrived",
  data: {
    regionId: string;
    goods?: string;
    quantity?: number;
    actorId?: string;
  }
): NPCObservation {
  return bus.emit(event, tick, {
    actorId: data.actorId,
    regionId: data.regionId,
    impact: event === "resource_shortage" ? -4 : event === "caravan_raided" ? -5 : 3,
    tags: ["economy", "trade", ...(data.goods ? [data.goods] : [])],
    payload: {
      goods: data.goods ?? "unknown",
      quantity: data.quantity ?? 0,
    },
  });
}

// ============================================================================
// Global Singleton (for easy access across game systems)
// ============================================================================

export const globalObservationBus = new NPCObservationBus();