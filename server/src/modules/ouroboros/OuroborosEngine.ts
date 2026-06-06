/**
 * OuroborosEngine — the top-level coordinator that closes the Ouroboros cycle.
 *
 * Past → Legend → Belief → Action → History → Past
 *
 * Wired into WorldTick.tick() to run alongside existing systems.
 * 
 * Integrates NPC Brain System for autonomous learning:
 * - NPCMemoryV3 for structured memory
 * - NPCObservationBus for world events
 * - NPCBrainRunner for decision making
 */

import { WorldEventBus, type WorldEvent } from "./WorldEventBus.js";
import { WorldHistory } from "./WorldHistory.js";
import { EmergentMarket } from "./EmergentMarket.js";
import { DynamicFactions } from "./DynamicFactions.js";
import { ouroborosTick, type AgentContext, type OuroborosConfig } from "./OuroborosLoop.js";
import { type NPCMemoryCache } from "../npc/NPCMemoryCache.js";
import { type NPCRelationshipSystem } from "../npc/NPCRelationshipSystem.js";
import { type ChatChannelRouter, type ChatRecipient, type SendToPlayerFn, type BroadcastFn, type ResolveSocketIdFn } from "../chat/ChatChannelRouter.js";
import { type StatusEmitter } from "../chat/StatusEmitter.js";

// Import NPC Brain System
import {
  NPCBrainRunner,
  globalObservationBus,
  createEmptyNPCMemoryV3,
  type NPCMemoryV3,
  type NPCDecision,
  type NPCWorldSnapshot,
  type NPCObservation,
  emitCombatEvent,
  emitTradeEvent,
  emitQuestEvent,
  emitFactionEvent,
  emitEconomyEvent,
} from "../npc/brain/index.js";

export interface OuroborosEngineConfig extends OuroborosConfig {
  /** How many world ticks between Ouroboros cycles. */
  tickInterval: number;
  /** How many world ticks between conflict resolution checks. */
  conflictCheckInterval: number;
  /** Enable NPC Brain autonomous learning system */
  enableNPCBrain: boolean;
  /** How many world ticks between NPC brain runs */
  npcBrainInterval: number;
}

const DEFAULT_ENGINE_CONFIG: OuroborosEngineConfig = {
  perceptionRadius: 50,
  legendSpreadChance: 0.02,
  factionFormChance: 0.01,
  familyFormChance: 0.005,
  tickInterval: 10,
  conflictCheckInterval: 100,
  enableNPCBrain: true,
  npcBrainInterval: 10, // 1 Hz at 10 ticks/sec
};

export class OuroborosEngine {
  public readonly eventBus: WorldEventBus;
  public readonly history: WorldHistory;
  public readonly market: EmergentMarket;
  public readonly factions: DynamicFactions;
  private config: OuroborosEngineConfig;
  private readonly SPATIAL_CHUNK_SIZE = 64;
  
  // NPC Brain System integration
  private npcBrainRunner: NPCBrainRunner;
  private npcMemories: Map<string, NPCMemoryV3> = new Map();

  constructor(config?: Partial<OuroborosEngineConfig>) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.eventBus = new WorldEventBus();
    this.history = new WorldHistory();
    this.market = new EmergentMarket();
    this.factions = new DynamicFactions();
    
    // Initialize NPC Brain Runner
    if (this.config.enableNPCBrain) {
      this.npcBrainRunner = new NPCBrainRunner(globalObservationBus);
    }

    this.eventBus.onAll((event) => {
      this.history.record(event);
    });
  }

  /**
   * Run the Ouroboros tick for all NPCs.
   * Called from WorldTick every tickInterval ticks.
   */
  private getSpatialKey(x: number, y: number): string {
    return `${Math.floor(x / this.SPATIAL_CHUNK_SIZE)}:${Math.floor(y / this.SPATIAL_CHUNK_SIZE)}`;
  }

  tick(
    tickCount: number,
    npcs: Array<{ id: string; name: string; position: { x: number; y: number }; faction?: string }>,
    players: Array<{ id: string; name: string; position: { x: number; y: number } }>,
    memoryCache: NPCMemoryCache,
    relationships: NPCRelationshipSystem,
    worldTime: number,
    chatRouter: ChatChannelRouter,
    statusEmitter: StatusEmitter,
    chatRecipients: ChatRecipient[],
    sendToPlayer: SendToPlayerFn,
    broadcast: BroadcastFn,
    resolveSocketId: ResolveSocketIdFn,
  ): void {
    if (tickCount % this.config.tickInterval !== 0) return;

    this.market.tick();

    // ⚡ Bolt Optimization: Spatial Partitioning for Proximity Checks
    // Reduces algorithmic complexity from O(N * (N+P)) to O(N * density)
    type SpatialEntity = { id: string; name: string; type: "npc" | "player"; position: { x: number; y: number }; faction?: string };
    const spatialMap = new Map<string, SpatialEntity[]>();

    // Single-pass entity grouping
    for (const n of npcs) {
      const key = this.getSpatialKey(n.position.x, n.position.y);
      let list = spatialMap.get(key);
      if (!list) {
        list = [];
        spatialMap.set(key, list);
      }
      list.push({ id: n.id, name: n.name, type: "npc", position: n.position, faction: n.faction });
    }
    for (const p of players) {
      const key = this.getSpatialKey(p.position.x, p.position.y);
      let list = spatialMap.get(key);
      if (!list) {
        list = [];
        spatialMap.set(key, list);
      }
      list.push({ id: p.id, name: p.name, type: "player", position: p.position });
    }

    const perceptionRadiusSq = this.config.perceptionRadius * this.config.perceptionRadius;

    for (const npc of npcs) {
      const nx = npc.position.x;
      const ny = npc.position.y;
      const cx = Math.floor(nx / this.SPATIAL_CHUNK_SIZE);
      const cy = Math.floor(ny / this.SPATIAL_CHUNK_SIZE);

      const nearby: SpatialEntity[] = [];
      // Query 3x3 chunk grid around the NPC
      for (let dx = -1; dx <= 1; dx++) {
        const queryX = (cx + dx) * this.SPATIAL_CHUNK_SIZE;
        for (let dy = -1; dy <= 1; dy++) {
          const queryY = (cy + dy) * this.SPATIAL_CHUNK_SIZE;
          const key = this.getSpatialKey(queryX, queryY);
          const list = spatialMap.get(key);
          if (!list) continue;

          for (let i = 0; i < list.length; i++) {
            const e = list[i];
            if (e.id === npc.id) continue;

            const edx = e.position.x - nx;
            const edy = e.position.y - ny;
            if (edx * edx + edy * edy <= perceptionRadiusSq) {
              nearby.push(e);
            }
          }
        }
      }

      const ctx: AgentContext = {
        npcId: npc.id,
        name: npc.name,
        position: npc.position,
        regionId: `region_${Math.floor(npc.position.x / 100)}_${Math.floor(npc.position.y / 100)}`,
        nearbyEntities: nearby,
        worldTime,
      };

      const action = ouroborosTick(
        ctx,
        memoryCache,
        this.eventBus,
        this.history,
        this.market,
        this.factions,
        (a, b) => relationships.getRelationship?.(a, b) ?? 0,
        (a, b, delta) => {
          relationships.adjustAffinity?.(a, b, delta);
        },
        this.config,
      );

      if (action) {
        const noisyActions = new Set(["trade_seek", "trade_buy"]);
        if (!noisyActions.has(action.type)) {
          statusEmitter.emitNpcThinking(npc.name, `[${action.type}]`, npc.position);
        }
      }

      // ─── NPC Brain Integration ────────────────────────────────────────────────
      // Run NPC brain for autonomous learning (every npcBrainInterval ticks)
      if (this.config.enableNPCBrain && this.npcBrainRunner && tickCount % this.config.npcBrainInterval === 0) {
        this.runNPCBrainTick(npc, ctx, tickCount, nearby);
      }
    }

    // Resolve faction conflicts periodically
    if (tickCount % this.config.conflictCheckInterval === 0) {
      const events = this.factions.resolveConflicts();
      for (const e of events) {
        const fA = this.factions.getFaction(e.factionA);
        const fB = this.factions.getFaction(e.factionB);
        if (!fA || !fB) continue;

        this.eventBus.emit({
          type: e.type,
          actorId: fA.id,
          actorName: fA.name,
          position: { x: 0, y: 0 },
          data: { factionA: fA.name, factionB: fB.name },
          intensity: e.type === "war_declared" ? 0.95 : 0.8,
          targetId: fB.id,
          targetName: fB.name,
        });

        if (e.type === "war_declared") {
          chatRouter.publish(
            {
              channel: "global",
              senderType: "system",
              senderId: "system",
              senderName: "[WELTEREIGNIS]",
              text: `${fA.name} hat ${fB.name} den Krieg erklärt!`,
            },
            chatRecipients, sendToPlayer, broadcast, resolveSocketId,
          );
        } else if (e.type === "alliance_formed") {
          chatRouter.publish(
            {
              channel: "global",
              senderType: "system",
              senderId: "system",
              senderName: "[WELTEREIGNIS]",
              text: `${fA.name} und ${fB.name} haben ein Bündnis geschmiedet.`,
            },
            chatRecipients, sendToPlayer, broadcast, resolveSocketId,
          );
        }
      }
    }
  }

  /** Expose stats for /health or admin panels. */
  getStats(): Record<string, unknown> {
    return {
      historyEntries: this.history.getEntryCount(),
      legends: this.history.getLegendCount(),
      factions: this.factions.getAllFactions().length,
      families: this.factions.getAllFamilies().length,
      marketRegions: this.market.getRegions().length,
      tradeRoutes: this.market.getEstablishedRoutes().length,
      // NPC Brain System stats
      npcBrainEnabled: this.config.enableNPCBrain,
      npcBrainInterval: this.config.npcBrainInterval,
      trackedNPCs: this.npcMemories.size,
      npcBrainStats: this.npcBrainRunner?.getStats() ?? null,
    };
  }

  // ─── NPC Brain Helper Methods ───────────────────────────────────────────────

  /**
   * Run NPC brain tick for single NPC
   */
  private runNPCBrainTick(
    npc: { id: string; name: string; position: { x: number; y: number }; faction?: string },
    ctx: AgentContext,
    tickCount: number,
    nearby: Array<{ id: string; name: string; type: "npc" | "player"; position: { x: number; y: number }; faction?: string }>
  ): void {
    if (!this.npcBrainRunner) return;

    // Get or create NPC memory
    let memory = this.npcMemories.get(npc.id);
    if (!memory) {
      memory = createEmptyNPCMemoryV3(
        npc.id,
        npc.name,
        ctx.regionId,
        "worker", // Default profession
        "citizen" // Default role
      );
      this.npcMemories.set(npc.id, memory);
    }

    // Build world snapshot
    const worldSnapshot: NPCWorldSnapshot = {
      tick: tickCount,
      regionId: ctx.regionId,
      timeOfDay: (tickCount % 1000) / 1000 * 24,
      dangerLevel: nearby.some((e) => e.type === "player" || e.type === "npc") ? 0.3 : 0.1,
      resourceAvailability: {},
      marketPrices: {},
      nearbyThreats: [],
      friendlyNPCs: nearby.filter((e) => e.type === "npc").map((e) => e.id),
      hostileNPCs: [],
    };

    // Build nearby entities for brain
    const brainNearbyEntities = nearby.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type as "player" | "npc" | "monster",
      position: e.position,
      faction: e.faction,
      hostile: e.type !== "npc", // Players are hostile by default in this simplified model
    }));

    // Run NPC brain
    const output = this.npcBrainRunner.runWithContext({
      npcId: npc.id,
      npcName: npc.name,
      position: npc.position,
      homeRegionId: ctx.regionId,
      factionId: npc.faction,
      state: "idle",
      health: 0.8, // TODO: Get from actual NPC state
      energy: 0.7,
      gold: 50,
      memory,
      nearbyEntities: brainNearbyEntities,
      tick: tickCount,
      worldSnapshot,
    });

    // Store updated memory
    this.npcMemories.set(npc.id, output.memory);

    // Emit world events based on NPC decisions
    this.emitNPCCognitiveEvents(npc, output.decision, tickCount);
  }

  /**
   * Emit world events from NPC decisions
   */
  private emitNPCCognitiveEvents(
    npc: { id: string; name: string; position: { x: number; y: number } },
    decision: NPCDecision,
    tickCount: number
  ): void {
    switch (decision.action) {
      case "raise_alarm":
        globalObservationBus.emit("player_attack", tickCount, {
          actorId: npc.id,
          actorName: npc.name,
          regionId: `region_${Math.floor(npc.position.x / 100)}_${Math.floor(npc.position.y / 100)}`,
          impact: -2,
          tags: ["alarm", "danger"],
          payload: { reason: decision.reason },
        });
        break;

      case "flee":
        globalObservationBus.emit("player_attack", tickCount, {
          actorId: npc.id,
          actorName: npc.name,
          regionId: `region_${Math.floor(npc.position.x / 100)}_${Math.floor(npc.position.y / 100)}`,
          impact: 1,
          tags: ["flee", "evasion"],
          payload: { reason: decision.reason },
        });
        break;

      case "trade":
        globalObservationBus.emit("player_trade", tickCount, {
          actorId: npc.id,
          actorName: npc.name,
          regionId: `region_${Math.floor(npc.position.x / 100)}_${Math.floor(npc.position.y / 100)}`,
          impact: 3,
          tags: ["trade", "economy"],
          payload: { reason: decision.reason },
        });
        break;
    }
  }

  /**
   * Get NPC memory by ID
   */
  getNPCMemory(npcId: string): NPCMemoryV3 | undefined {
    return this.npcMemories.get(npcId);
  }

  /**
   * Get all NPC memories (for debugging)
   */
  getAllNPCMemories(): Map<string, NPCMemoryV3> {
    return this.npcMemories;
  }

  /**
   * Reset NPC brain state (for world reset)
   */
  resetNPCBrains(): void {
    this.npcMemories.clear();
    this.npcBrainRunner?.reset();
  }
}
