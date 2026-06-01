/**
 * OuroborosLoop — the self-sustaining agent cycle.
 *
 * PERCEIVE → EVALUATE → ACT → REMEMBER → UPDATE → back to PERCEIVE
 *
 * Runs once per NPC agent per Ouroboros tick (~every 10 world ticks).
 * Each agent carries memory, heuristics, needs, relationships, goals.
 *
 * All randomness uses deterministic hashing for replayability.
 */

import { type NPCMemoryCache } from "../npc/NPCMemoryCache.js";
import { type WorldEventBus } from "./WorldEventBus.js";
import { type WorldHistory } from "./WorldHistory.js";
import { type EmergentMarket } from "./EmergentMarket.js";
import { type DynamicFactions } from "./DynamicFactions.js";
import { type NeedSet, decayNeeds, mostUrgentNeed, needToGoalCategory, restoreNeed } from "./AgentNeeds.js";

// ─── Deterministic Utilities ──────────────────────────────────────────────

/** Fowler-Noll-Vo hash (32-bit). Reproducible across runs/environments. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic chance roll using hash. Returns true with given probability. */
function deterministicChance(seed: string, chance: number): boolean {
  if (chance <= 0) return false;
  if (chance >= 1) return true;
  return hash32(seed) / 0xffffffff < chance;
}

/** Deterministic array index selection using hash. */
function deterministicIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  return hash32(seed) % length;
}

/** Squared distance for efficient distance checks (skip sqrt). */
function distanceSq(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

// ─── Context & Config ─────────────────────────────────────────────────────

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

// ─── Action Intent ─────────────────────────────────────────────────────────

export type ActionType =
  | "idle"
  | "flee"
  | "trade_seek"
  | "trade_buy"
  | "faction_formed"
  | "family_formed"
  | "legend_spread"
  | "territory_claim"
  | "reputation_seek";

export interface OuroborosActionIntent {
  type: ActionType;
  priority: number;
  reason: string;
  targetId?: string;
  regionId?: string;
  data?: Record<string, unknown>;
}

// ─── Heuristic State ──────────────────────────────────────────────────────

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
 * Remove agent from heuristic state store.
 * Call this when an NPC despawns to prevent memory leaks.
 */
export function forgetOuroborosAgent(npcId: string): void {
  agentHeuristicStates.delete(npcId);
}

/**
 * Run one Ouroboros cycle for a single NPC agent.
 * Returns an ActionIntent instead of a raw string for better orchestration.
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
): OuroborosActionIntent {
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

  // ─── PERCEIVE ────────────────────────────────────────────────────────────
  // Filter nearby entities by perception radius
  const radiusSq = config.perceptionRadius * config.perceptionRadius;
  const perceivedEntities = ctx.nearbyEntities.filter(
    (e) => distanceSq(ctx.position, e.position) <= radiusSq,
  );

  // Filter by relationship within perceived radius
  const nearbyFriends = perceivedEntities.filter((e) => getRelationship(ctx.npcId, e.id) > 0.3);
  const nearbyEnemies = perceivedEntities.filter((e) => getRelationship(ctx.npcId, e.id) < -0.3);
  const myFaction = factions.getAgentFaction(ctx.npcId);

  // Perceive: record observations
  if (nearbyEnemies.length > 0) {
    memoryCache.observe(ctx.npcId, `enemies_nearby:${nearbyEnemies.map((e) => e.name).join(",")}`);
    restoreNeed(needs, "safety", -0.1);
  }
  if (nearbyFriends.length > 0) {
    restoreNeed(needs, "belonging", 0.05);
  }

  // ─── EVALUATE ─────────────────────────────────────────────────────────────
  decayNeeds(needs);
  const urgentNeed = mostUrgentNeed(needs);
  const goalCategory = needToGoalCategory(urgentNeed);

  // ─── ACT ──────────────────────────────────────────────────────────────────
  let intent: OuroborosActionIntent = {
    type: "idle",
    priority: 0,
    reason: "no_action_possible",
  };

  switch (goalCategory) {
    case "seek_safety": {
      if (nearbyEnemies.length > 0 && needs.safety < 0.3) {
        const target = nearbyEnemies[deterministicIndex(`${ctx.npcId}:${ctx.worldTime}:fleeTarget`, nearbyEnemies.length)];
        intent = {
          type: "flee",
          priority: 10,
          reason: `enemies_nearby:${target.name}`,
          targetId: target.id,
          data: { enemyCount: nearbyEnemies.length },
        };
        memoryCache.logEvent(ctx.npcId, `flee:${target.name}`);
      }
      break;
    }

    case "gather_resources": {
      if ((hw.tradeWillingness ?? 0.5) > 0.4) {
        intent = {
          type: "trade_seek",
          priority: 5,
          reason: "seeking_trade",
          regionId: ctx.regionId,
        };
        memoryCache.logEvent(ctx.npcId, "seeking_trade");
      }
      break;
    }

    case "socialize": {
      // Try to form faction if enough nearby friends (not random NPCs)
      if (
        !myFaction &&
        perceivedEntities.length >= 3 &&
        deterministicChance(`${ctx.npcId}:${ctx.worldTime}:formFaction`, config.factionFormChance)
      ) {
        const candidates = perceivedEntities
          .filter(
            (e) =>
              e.type === "npc" &&
              !factions.getAgentFaction(e.id) &&
              getRelationship(ctx.npcId, e.id) > 0.15, // Minimum relationship threshold
          )
          .map((e) => e.id);

        if (candidates.length >= 2 && factions.canFormFaction([ctx.npcId, ...candidates])) {
          const members = candidates.slice(0, 4);
          const faction = factions.formFaction(`Bund von ${ctx.name}`, ctx.npcId, members);
          intent = {
            type: "faction_formed",
            priority: 8,
            reason: `formed:${faction.name}`,
            data: { factionId: faction.id, factionName: faction.name, memberCount: faction.members.size },
          };
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

      // Try forming family with best friend (deterministic selection)
      if (intent.type === "idle" && nearbyFriends.length > 0 && deterministicChance(`${ctx.npcId}:${ctx.worldTime}:formFamily`, config.familyFormChance)) {
        const bestIdx = deterministicIndex(`${ctx.npcId}:${ctx.worldTime}:bestFriend`, nearbyFriends.length);
        const bestFriend = nearbyFriends[bestIdx];
        const family = factions.formFamily(ctx.npcId, bestFriend.id, getRelationship(ctx.npcId, bestFriend.id));
        if (family) {
          intent = {
            type: "family_formed",
            priority: 7,
            reason: `family_with:${bestFriend.name}`,
            targetId: bestFriend.id,
            data: { familyId: family.id },
          };
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

      // Spread legends (oral tradition) — deterministic selection
      if (intent.type === "idle" && deterministicChance(`${ctx.npcId}:${ctx.worldTime}:legendSpread`, config.legendSpreadChance)) {
        const unknownLegends = history.getLegendsUnknownTo(ctx.npcId);
        const myLegends = history.getLegendsKnownBy(ctx.npcId);

        if (myLegends.length > 0 && nearbyFriends.length > 0) {
          const legendIdx = deterministicIndex(`${ctx.npcId}:${ctx.worldTime}:legend`, myLegends.length);
          const legend = myLegends[legendIdx];
          const targetIdx = deterministicIndex(`${ctx.npcId}:${ctx.worldTime}:legendTarget`, nearbyFriends.length);
          const target = nearbyFriends[targetIdx];

          history.spreadLegend(legend.id, ctx.npcId, target.id);
          intent = {
            type: "legend_spread",
            priority: 3,
            reason: `spread:${legend.title}:to:${target.name}`,
            targetId: target.id,
            data: { legendId: legend.id, legendTitle: legend.title },
          };
          memoryCache.logEvent(ctx.npcId, `spread_legend:${legend.title}:to:${target.name}`);
        }
        // Learn legends from nearby agents (deterministic teller selection)
        if (unknownLegends.length > 0) {
          for (const legend of unknownLegends.slice(0, 2)) {
            const possibleTellers = nearbyFriends.filter((f) => legend.knownBy.has(f.id));
            if (possibleTellers.length > 0) {
              const teller = possibleTellers[deterministicIndex(`${ctx.npcId}:${ctx.worldTime}:legendTeller`, possibleTellers.length)];
              history.spreadLegend(legend.id, teller.id, ctx.npcId);
              memoryCache.observe(ctx.npcId, `learned_legend:${legend.title}`);
            }
          }
        }
      }

      // Improve relationships bidirectionally (social balance)
      for (const friend of nearbyFriends.slice(0, 2)) {
        setRelationship(ctx.npcId, friend.id, 0.01);
        setRelationship(friend.id, ctx.npcId, 0.005); // Reciprocal but asymmetric
      }
      break;
    }

    case "gain_reputation": {
      intent = {
        type: "reputation_seek",
        priority: 4,
        reason: "seeking_reputation",
        regionId: ctx.regionId,
      };
      break;
    }

    case "trade": {
      const price = market.getPrice(ctx.regionId, "common_goods");
      if (price < 15 && needs.wealth < 0.5) {
        const cost = market.buy(ctx.regionId, "common_goods", 1);
        if (cost >= 0) {
          restoreNeed(needs, "wealth", 0.05);
          intent = {
            type: "trade_buy",
            priority: 6,
            reason: `bought:common_goods:at:${price}`,
            regionId: ctx.regionId,
            data: { price, cost },
          };
          memoryCache.logEvent(ctx.npcId, `bought:common_goods:at:${price}`);
        }
      }
      break;
    }

    case "expand_influence": {
      if (myFaction) {
        intent = {
          type: "territory_claim",
          priority: 2,
          reason: `claiming:${ctx.regionId}:for:${myFaction.name}`,
          regionId: ctx.regionId,
          data: { factionId: myFaction.id },
        };
        // Note: Actual territory mutation should happen in WorldReducer, not here
      }
      break;
    }
  }

  // ─── REMEMBER ─────────────────────────────────────────────────────────────
  if (intent.type !== "idle") {
    memoryCache.setGoal(ctx.npcId, goalCategory);
    state.dirty = true;
  }

  // ─── UPDATE (heuristics based on experience) ─────────────────────────────
  // Persist needs back into heuristic weights
  hw._needsSafety = needs.safety;
  hw._needsResources = needs.resources;
  hw._needsBelonging = needs.belonging;
  hw._needsStatus = needs.status;
  hw._needsWealth = needs.wealth;
  hw._needsPower = needs.power;
  state.dirty = true;

  return intent;
}
