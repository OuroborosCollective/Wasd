// @ts-nocheck
/**
 * NPCHeuristics — local heuristic weight updates based on outcomes.
 *
 * Each NPC learns independently: weights adjust after major decisions/outcomes.
 * Weights are clamped to [0, 1].
 */

import { SeededARERng, createARESeed } from "../../core/determinism/AREDeterminism.js";
import { type HeuristicWeights, type NPCMemoryCache } from "./NPCMemoryCache.js";

const LEARN_RATE = 0.05;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function adjustWeight(weights: HeuristicWeights, key: string, delta: number): void {
  if (key in weights) {
    weights[key] = clamp01(weights[key] + delta);
  }
}

function roll(npcId: string, action: string, seed: string | number = 0): number {
  return new SeededARERng(createARESeed(["npc-heuristics", npcId, action, seed])).nextFloat();
}

/** Call after a successful trade. */
export function onTradeSuccess(cache: NPCMemoryCache, npcId: string): void {
  const s = cache.get(npcId);
  adjustWeight(s.heuristicWeights, "tradeWillingness", LEARN_RATE);
  s.dirty = true;
}

/** Call after a failed/rejected trade. */
export function onTradeFailure(cache: NPCMemoryCache, npcId: string): void {
  const s = cache.get(npcId);
  adjustWeight(s.heuristicWeights, "tradeWillingness", -LEARN_RATE * 0.5);
  s.dirty = true;
}

/** Call after NPC won combat. */
export function onCombatWin(cache: NPCMemoryCache, npcId: string): void {
  const s = cache.get(npcId);
  adjustWeight(s.heuristicWeights, "aggression", LEARN_RATE);
  adjustWeight(s.heuristicWeights, "fleeThreshold", -LEARN_RATE * 0.3);
  s.dirty = true;
}

/** Call after NPC fled or lost combat. */
export function onCombatLoss(cache: NPCMemoryCache, npcId: string): void {
  const s = cache.get(npcId);
  adjustWeight(s.heuristicWeights, "aggression", -LEARN_RATE);
  adjustWeight(s.heuristicWeights, "fleeThreshold", LEARN_RATE);
  s.dirty = true;
}

/** Call after successful party formation. */
export function onPartyFormed(cache: NPCMemoryCache, npcId: string): void {
  const s = cache.get(npcId);
  adjustWeight(s.heuristicWeights, "partySeeking", LEARN_RATE);
  adjustWeight(s.heuristicWeights, "chatFrequency", LEARN_RATE * 0.5);
  s.dirty = true;
}

/** Call after party request was ignored/declined. */
export function onPartyRejected(cache: NPCMemoryCache, npcId: string): void {
  const s = cache.get(npcId);
  adjustWeight(s.heuristicWeights, "partySeeking", -LEARN_RATE * 0.5);
  s.dirty = true;
}

/**
 * Whether the NPC should attempt a chat action this tick.
 * Based on chatFrequency weight + deterministic ARE roll.
 */
export function shouldChat(cache: NPCMemoryCache, npcId: string, seed: string | number = 0): boolean {
  const s = cache.get(npcId);
  return roll(npcId, "chat", seed) < s.heuristicWeights.chatFrequency * 0.1;
}

/**
 * Whether the NPC should seek a party this tick.
 */
export function shouldSeekParty(cache: NPCMemoryCache, npcId: string, seed: string | number = 0): boolean {
  const s = cache.get(npcId);
  return s.partyId === null && roll(npcId, "party", seed) < s.heuristicWeights.partySeeking * 0.05;
}

/**
 * Whether the NPC should try to trade.
 */
export function shouldTrade(cache: NPCMemoryCache, npcId: string, seed: string | number = 0): boolean {
  const s = cache.get(npcId);
  return roll(npcId, "trade", seed) < s.heuristicWeights.tradeWillingness * 0.04;
}
