/**
 * OuroborosEngine — the top-level coordinator that closes the Ouroboros cycle.
 *
 * Past → Legend → Belief → Action → History → Past
 *
 * Wired into WorldTick.tick() to run alongside existing systems.
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

export interface OuroborosEngineConfig extends OuroborosConfig {
  /** How many world ticks between Ouroboros cycles. */
  tickInterval: number;
  /** How many world ticks between conflict resolution checks. */
  conflictCheckInterval: number;
}

const DEFAULT_ENGINE_CONFIG: OuroborosEngineConfig = {
  perceptionRadius: 50,
  legendSpreadChance: 0.02,
  factionFormChance: 0.01,
  familyFormChance: 0.005,
  tickInterval: 10,
  conflictCheckInterval: 100,
};

export class OuroborosEngine {
  public readonly eventBus: WorldEventBus;
  public readonly history: WorldHistory;
  public readonly market: EmergentMarket;
  public readonly factions: DynamicFactions;
  private config: OuroborosEngineConfig;

  constructor(config?: Partial<OuroborosEngineConfig>) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.eventBus = new WorldEventBus();
    this.history = new WorldHistory();
    this.market = new EmergentMarket();
    this.factions = new DynamicFactions();

    this.eventBus.onAll((event) => {
      this.history.record(event);
    });
  }

  /**
   * Run the Ouroboros tick for all NPCs.
   * Called from WorldTick every tickInterval ticks.
   */
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

    const allEntities = [
      ...npcs.map((n) => ({ id: n.id, name: n.name, type: "npc" as const, position: n.position, faction: n.faction })),
      ...players.map((p) => ({ id: p.id, name: p.name, type: "player" as const, position: p.position })),
    ];

    for (const npc of npcs) {
      const nearby = allEntities.filter(
        (e) => e.id !== npc.id && Math.hypot(e.position.x - npc.position.x, e.position.y - npc.position.y) <= this.config.perceptionRadius,
      );

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
        (a, b) => relationships.get(a, b),
        (a, b, delta) => relationships.adjustAffinity(a, b, delta),
        this.config,
      );

      if (action) {
        const noisyActions = new Set(["trade_seek", "trade_buy"]);
        if (!noisyActions.has(action)) {
          statusEmitter.emitNpcThinking(npc.name, `[${action}]`, npc.position);
        }
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
    };
  }
}
