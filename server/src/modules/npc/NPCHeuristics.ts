/**
 * NPCHeuristics — deterministic, cache-local learning weights for NPC outcomes.
 *
 * NPCMemoryCache persists memories and events. Learning weights are maintained in
 * a WeakMap keyed by that cache instance, preventing cross-runtime leakage while
 * keeping the memory cache's append-only record contract intact.
 */
import { SeededARERng, createARESeed } from "../../core/determinism/AREDeterminism.js";
import type { NPCMemoryCache } from "./NPCMemoryCache.js";

export interface HeuristicWeights {
  aggression: number;
  tradeWillingness: number;
  partySeeking: number;
  chatFrequency: number;
  fleeThreshold: number;
}

const LEARN_RATE = 0.05;
const DEFAULT_WEIGHTS: Readonly<HeuristicWeights> = Object.freeze({
  aggression: 0.5,
  tradeWillingness: 0.5,
  partySeeking: 0.5,
  chatFrequency: 0.5,
  fleeThreshold: 0.5,
});
const weightsByCache = new WeakMap<object, Map<string, HeuristicWeights>>();

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function roll(npcId: string, action: string, seed: string | number = 0): number {
  return new SeededARERng(createARESeed(["npc-heuristics", npcId, action, seed])).nextFloat();
}

function weightsFor(cache: NPCMemoryCache, npcId: string): HeuristicWeights {
  let byNpc = weightsByCache.get(cache);
  if (!byNpc) {
    byNpc = new Map<string, HeuristicWeights>();
    weightsByCache.set(cache, byNpc);
  }
  let weights = byNpc.get(npcId);
  if (!weights) {
    weights = { ...DEFAULT_WEIGHTS };
    byNpc.set(npcId, weights);
  }
  return weights;
}

function adjust(cache: NPCMemoryCache, npcId: string, key: keyof HeuristicWeights, delta: number, event: string): void {
  const weights = weightsFor(cache, npcId);
  weights[key] = clamp01(weights[key] + delta);
  cache.logEvent(npcId, event);
}

/** Returns an immutable snapshot of the cache-local learning weights. */
export function getHeuristicWeights(cache: NPCMemoryCache, npcId: string): Readonly<HeuristicWeights> {
  return Object.freeze({ ...weightsFor(cache, npcId) });
}

/** Call after a successful trade. */
export function onTradeSuccess(cache: NPCMemoryCache, npcId: string): void {
  adjust(cache, npcId, "tradeWillingness", LEARN_RATE, "trade_success");
}

/** Call after a failed/rejected trade. */
export function onTradeFailure(cache: NPCMemoryCache, npcId: string): void {
  adjust(cache, npcId, "tradeWillingness", -LEARN_RATE * 0.5, "trade_failure");
}

/** Call after NPC won combat. */
export function onCombatWin(cache: NPCMemoryCache, npcId: string): void {
  adjust(cache, npcId, "aggression", LEARN_RATE, "combat_win");
  adjust(cache, npcId, "fleeThreshold", -LEARN_RATE * 0.3, "combat_win");
}

/** Call after NPC fled or lost combat. */
export function onCombatLoss(cache: NPCMemoryCache, npcId: string): void {
  adjust(cache, npcId, "aggression", -LEARN_RATE, "combat_loss");
  adjust(cache, npcId, "fleeThreshold", LEARN_RATE, "combat_loss");
}

/** Call after successful party formation. */
export function onPartyFormed(cache: NPCMemoryCache, npcId: string): void {
  adjust(cache, npcId, "partySeeking", LEARN_RATE, "party_formed");
  adjust(cache, npcId, "chatFrequency", LEARN_RATE * 0.5, "party_formed");
}

/** Call after party request was ignored/declined. */
export function onPartyRejected(cache: NPCMemoryCache, npcId: string): void {
  adjust(cache, npcId, "partySeeking", -LEARN_RATE * 0.5, "party_rejected");
}

/** Whether the NPC should attempt a chat action for the deterministic seed. */
export function shouldChat(cache: NPCMemoryCache, npcId: string, seed: string | number = 0): boolean {
  return roll(npcId, "chat", seed) < weightsFor(cache, npcId).chatFrequency * 0.1;
}

/** Whether the NPC should seek a party for the deterministic seed. */
export function shouldSeekParty(cache: NPCMemoryCache, npcId: string, seed: string | number = 0): boolean {
  return roll(npcId, "party", seed) < weightsFor(cache, npcId).partySeeking * 0.05;
}

/** Whether the NPC should try to trade for the deterministic seed. */
export function shouldTrade(cache: NPCMemoryCache, npcId: string, seed: string | number = 0): boolean {
  return roll(npcId, "trade", seed) < weightsFor(cache, npcId).tradeWillingness * 0.04;
}
