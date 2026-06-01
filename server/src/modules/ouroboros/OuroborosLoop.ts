/**
 * OuroborosLoop — the self-sustaining agent cycle.
 *
 * PERCEIVE → EVALUATE → ACT → REMEMBER → UPDATE → back to PERCEIVE
 *
 * Runs once per NPC agent per Ouroboros tick (~every 10 world ticks).
 * Each agent carries memory, heuristics, needs, relationships, goals.
 */

import { type NPCMemoryCache } from "../npc/NPCMemoryCache.js";
import { type WorldEventBus } from "./WorldEventBus.js";
import { type WorldHistory } from "./WorldHistory.js";
import { type EmergentMarket } from "./EmergentMarket.js";
import { type DynamicFactions } from "./DynamicFactions.js";
import { type NeedSet, decayNeeds, mostUrgentNeed, needToGoalCategory, restoreNeed } from "./AgentNeeds.js";

export interface AgentContext {
  npcId: string;
  name: string;
  position: { x: number; y: number };
  regionId: string;
  /** Nearby entity IDs (players + NPCs within perception radius). */
  nearbyEntities: Array<{ id: string; name: string; type: string; position: { x: number; y: number }; faction?: string }>;
  worldTime: number;
}

export interface OuroborosConfig {
  perceptionRadius: number;
  legendSpreadChance: number;
  factionFormChance: number;
  familyFormChance: number;
}

const DEFAULT_CONFIG: OuroborosConfig = {
  perceptionRadius: 50,
  legendSpreadChance: 0.02,
  factionFormChance: 0.01,
  familyFormChance: 0.005,
};

/** Heuristic scratch state (NPCMemoryCache stores Memory[], not numeric weights). */
interface AgentHeuristicState {
  dirty: boolean;
  heuristicWeights: {
    _needsSafety: number;
    _needsResources: number;
    _needsBelonging: number;
    _needsStatus: number;
    _needsWealth: number;
    _needsPower: number;
    tradeWillingness?: number;
  };
}

const agentHeuristicStates = new Map<string, AgentHeuristicState>();

function getAgentState(npcId: string): AgentHeuristicState {
  let s = agentHeuristicStates.get(npcId);
  if (!s) {
    s = {
      dirty: false,
      heuristicWeights: {
        _needsSafety: 0.8,
        _needsResources: 0.5,
        _needsBelonging: 0.4,
        _needsStatus: 0.3,
        _needsWealth: 0.3,
        _needsPower: 0.2,
        tradeWillingness: 0.5,
      },
    };
    agentHeuristicStates.set(npcId, s);
  }
  return s;
}

/**
 * Run one Ouroboros cycle for a single NPC agent.
 */
export function ouroborosTick(
  ctx: AgentContext,
  memoryCache: NPCMemoryCache,
  eventBus: WorldEventBus,
  history: WorldHistory,
  market: EmergentMarket,
  factions: DynamicFactions,
  getRelationship: (a: string, b: string) => number,
  setRelationship: (a: string, b: string, delta: number) => void,
  config: OuroborosConfig = DEFAULT_CONFIG,
): string | null {
  const state = getAgentState(ctx.npcId);
  const hw = state.heuristicWeights;

  const needs: NeedSet = {
    safety: hw._needsSafety ?? 0.8,
    resources: hw._needsResources ?? 0.5,
    belonging: hw._needsBelonging ?? 0.4,
    status: hw._needsStatus ?? 0.3,
    wealth: hw._needsWealth ?? 0.3,
    power: hw._needsPower ?? 0.2,
  };

  // ─── PERCEIVE ──────────────────────────────────────────────────────────
  const nearbyFriends = ctx.nearbyEntities.filter((e) => getRelationship(ctx.npcId, e.id) > 0.3);
  const nearbyEnemies = ctx.nearbyEntities.filter((e) => getRelationship(ctx.npcId, e.id) < -0.3);
  const myFaction = factions.getAgentFaction(ctx.npcId);

  // Perceive: record observations
  if (nearbyEnemies.length > 0) {
    memoryCache.observe(ctx.npcId, `enemies_nearby:${nearbyEnemies.map((e) => e.name).join(",")}`);
    restoreNeed(needs, "safety", -0.1);
  }
  if (nearbyFriends.length > 0) {
    restoreNeed(needs, "belonging", 0.05);
  }

  // ─── EVALUATE ──────────────────────────────────────────────────────────
  decayNeeds(needs);
  const urgentNeed = mostUrgentNeed(needs);
  const goalCategory = needToGoalCategory(urgentNeed);

  // ─── ACT ───────────────────────────────────────────────────────────────
  let action: string | null = null;

  switch (goalCategory) {
    case "seek_safety": {
      if (nearbyEnemies.length > 0 && needs.safety < 0.3) {
        action = "flee";
        memoryCache.logEvent(ctx.npcId, `flee:${nearbyEnemies[0].name}`);
      }
      break;
    }

    case "gather_resources": {
      if ((hw.tradeWillingness ?? 0.5) > 0.4) {
        action = "trade_seek";
        memoryCache.logEvent(ctx.npcId, "seeking_trade");
      }
      break;
    }

    case "socialize": {
      // Try to form faction if enough unaffiliated nearby agents
      if (!myFaction && ctx.nearbyEntities.length >= 3 && 0 < config.factionFormChance) {
        const candidates = ctx.nearbyEntities
          .filter((e) => e.type === "npc" && !factions.getAgentFaction(e.id))
          .map((e) => e.id);
        if (factions.canFormFaction([ctx.npcId, ...candidates])) {
          const members = candidates.slice(0, 4);
          const faction = factions.formFaction(`Bund von ${ctx.name}`, ctx.npcId, members);
          action = "faction_formed";
          eventBus.emit({
            type: "faction_formed",
            actorId: ctx.npcId,
            actorName: ctx.name,
            position: ctx.position,
            data: { factionId: faction.id, factionName: faction.name, memberCount: faction.members.size },
            intensity: 0.7,
          });
        }
      }

      // Try forming family with high-affinity agent
      if (!action && nearbyFriends.length > 0 && 0 < config.familyFormChance) {
        const bestFriend = nearbyFriends.reduce((best, e) =>
          getRelationship(ctx.npcId, e.id) > getRelationship(ctx.npcId, best.id) ? e : best,
        );
        const family = factions.formFamily(ctx.npcId, bestFriend.id, getRelationship(ctx.npcId, bestFriend.id));
        if (family) {
          action = "family_formed";
          eventBus.emit({
            type: "family_formed",
            actorId: ctx.npcId,
            actorName: ctx.name,
            position: ctx.position,
            data: { familyId: family.id },
            intensity: 0.6,
            targetId: bestFriend.id,
            targetName: bestFriend.name,
          });
        }
      }

      // Spread legends (oral tradition)
      if (!action && 0 < config.legendSpreadChance) {
        const unknownLegends = history.getLegendsUnknownTo(ctx.npcId);
        const myLegends = history.getLegendsKnownBy(ctx.npcId);
        if (myLegends.length > 0 && nearbyFriends.length > 0) {
          const legend = myLegends[Math.floor(0 * myLegends.length)];
          const target = nearbyFriends[Math.floor(0 * nearbyFriends.length)];
          history.spreadLegend(legend.id, ctx.npcId, target.id);
          action = "legend_spread";
          memoryCache.logEvent(ctx.npcId, `spread_legend:${legend.title}:to:${target.name}`);
        }
        // Learn legends from nearby agents
        if (unknownLegends.length > 0) {
          for (const legend of unknownLegends.slice(0, 2)) {
            const teller = nearbyFriends.find((f) => legend.knownBy.has(f.id));
            if (teller) {
              history.spreadLegend(legend.id, teller.id, ctx.npcId);
              memoryCache.observe(ctx.npcId, `learned_legend:${legend.title}`);
            }
          }
        }
      }

      // Improve relationships with nearby friendly agents
      for (const friend of nearbyFriends.slice(0, 2)) {
        setRelationship(ctx.npcId, friend.id, 0.01);
      }
      break;
    }

    case "gain_reputation": {
      action = "reputation_seek";
      break;
    }

    case "trade": {
      const price = market.getPrice(ctx.regionId, "common_goods");
      if (price < 15 && needs.wealth < 0.5) {
        market.buy(ctx.regionId, "common_goods", 1);
        restoreNeed(needs, "wealth", 0.05);
        action = "trade_buy";
        memoryCache.logEvent(ctx.npcId, `bought:common_goods:at:${price}`);
      }
      break;
    }

    case "expand_influence": {
      if (myFaction) {
        myFaction.territory.add(ctx.regionId);
        action = "territory_claim";
      }
      break;
    }
  }

  // ─── REMEMBER ──────────────────────────────────────────────────────────
  if (action) {
    memoryCache.setGoal(ctx.npcId, goalCategory);
    state.dirty = true;
  }

  // ─── UPDATE (heuristics based on experience) ──────────────────────────
  // Persist needs back into heuristic weights
  hw._needsSafety = needs.safety;
  hw._needsResources = needs.resources;
  hw._needsBelonging = needs.belonging;
  hw._needsStatus = needs.status;
  hw._needsWealth = needs.wealth;
  hw._needsPower = needs.power;
  state.dirty = true;

  return action;
}
