/**
 * NPC MEMORY & RUMOR TYPES
 *
 * Server-authoritative deterministic types for NPC memory persistence
 * and rumor network propagation.
 *
 * Determinism rules:
 * - No Date.now() for gameplay state
 * - No Math.random() for gameplay IDs
 * - No UUID for memory event IDs
 * - All IDs must be deterministic based on input values
 * - Client-authoritative memory writes are rejected
 */

import type { NpcDialogueState } from "../quests/NpcQuestTypes.js";

/**
 * Trust tier for NPC-player relationship.
 * Derived deterministically from reputation value.
 */
export type TrustTier = "hostile" | "cold" | "neutral" | "trusted" | "honored";

/**
 * Memory event kinds that can be recorded.
 * Each kind contributes to NPC memory and may trigger rumors.
 */
export type NpcMemoryEventKind =
  | "quest_accepted"
  | "quest_completed"
  | "sell_completed"
  | "trade_completed"
  | "gift_given"
  | "interaction_failed"
  | "hostile_action"
  | "rumor_heard";

/**
 * Rumor kinds that can be created from memory events.
 * Each rumor type has social consequences for the player.
 */
export type NpcRumorKind =
  | "helped_village"
  | "reliable_supplier"
  | "troublemaker"
  | "hostile_actor"
  | "trusted_worker";

/**
 * Memory event recorded for an NPC-player interaction.
 * Event ID is deterministic: `${npcId}:${playerId}:${kind}:${logicalIndex}:${sourceId}`
 */
export interface NpcMemoryEvent {
  readonly eventId: string;
  readonly npcId: string;
  readonly playerId: string;
  readonly kind: NpcMemoryEventKind;
  readonly logicalIndex: number;
  readonly sourceId: string;
  readonly reputationDelta: number;
  readonly note: string;
}

/**
 * Persisted NPC memory state for a player-NPC pair.
 * Stored server-side and restored on session reload.
 */
export interface PersistedNpcMemoryState {
  readonly schemaVersion: 1;
  readonly playerId: string;
  readonly npcId: string;
  readonly reputation: number;
  readonly trustTier: TrustTier;
  readonly completedQuestIds: readonly string[];
  readonly memoryEvents: readonly NpcMemoryEvent[];
  readonly knownRumorIds: readonly string[];
}

/**
 * Rumor record created from significant memory events.
 * Rumor ID is deterministic: `${sourceNpcId}:${playerId}:${sourceEventId}:rumor`
 */
export interface NpcRumor {
  readonly rumorId: string;
  readonly sourceNpcId: string;
  readonly playerId: string;
  readonly sourceEventId: string;
  readonly kind: NpcRumorKind;
  readonly weight: number;
  readonly createdAtTick: number;
  readonly heardByNpcIds: readonly string[];
  readonly note: string;
}

/**
 * Memory snapshot for LiveGameplaySnapshot.
 * Exposes summary data without full raw history.
 */
export interface NpcMemorySnapshot {
  readonly npcId: string;
  readonly playerId: string;
  readonly reputation: number;
  readonly trustTier: TrustTier;
  readonly memoryEventCount: number;
  readonly recentMemoryNotes: readonly string[];
  readonly knownRumorCount: number;
}

/**
 * Rumor snapshot for LiveGameplaySnapshot.
 */
export interface NpcRumorSnapshot {
  readonly rumorId: string;
  readonly npcId: string;
  readonly playerId: string;
  readonly kind: NpcRumorKind;
  readonly weight: number;
  readonly note: string;
  readonly sourceNpcId: string;
}

/**
 * Effective trust calculation result.
 * Combines direct reputation with rumor influence.
 */
export interface EffectiveTrust {
  readonly npcId: string;
  readonly playerId: string;
  readonly directReputation: number;
  readonly rumorBonus: number;
  readonly effectiveReputation: number;
  readonly trustTier: TrustTier;
}

/**
 * Memory store interface for persistence backends.
 * Implementations must provide atomic save/load operations.
 */
export interface NpcMemoryStore {
  /**
   * Load persisted memory state for a player-NPC pair.
   * Returns null if no state exists.
   */
  load(playerId: string, npcId: string): Promise<PersistedNpcMemoryState | null>;

  /**
   * Save memory state atomically.
   * Implementation must ensure no partial mutation on failure.
   */
  save(state: PersistedNpcMemoryState): Promise<void>;

  /**
   * List all memory states for a player.
   */
  listForPlayer(playerId: string): Promise<readonly PersistedNpcMemoryState[]>;
}

/**
 * Rumor eligibility rules for deterministic propagation.
 * A rumor can only spread to eligible NPCs.
 */
export interface RumorEligibilityRule {
  readonly type: "same_settlement" | "social_edge" | "vendor_quest_npc";
  readonly npcIds: readonly string[];
}

/**
 * Fail reasons for memory/rumor operations.
 */
export const MemoryFailReasons = {
  MISSING_PLAYER: "missing_player",
  MISSING_NPC: "missing_npc",
  MISSING_RUMOR: "missing_rumor",
  INVALID_RUMOR_KIND: "invalid_rumor_kind",
  DUPLICATE_RUMOR: "duplicate_rumor",
  DUPLICATE_MEMORY_EVENT: "duplicate_memory_event",
  INVALID_LOGICAL_INDEX: "invalid_logical_index",
  RUMOR_PROPAGATION_REJECTED: "rumor_propagation_rejected",
  PERSISTENCE_LOAD_FAILED: "persistence_load_failed",
  PERSISTENCE_SAVE_FAILED: "persistence_save_failed",
} as const;

export type MemoryFailReason = typeof MemoryFailReasons[keyof typeof MemoryFailReasons];

/**
 * Result type for memory operations.
 */
export type MemoryResult<T> =
  | { ok: true; result: T }
  | { ok: false; reason: MemoryFailReason; details?: Record<string, unknown> };

/**
 * Convert reputation value to trust tier.
 * Deterministic: no randomness, derived from reputation.
 */
export function reputationToTrustTier(reputation: number): TrustTier {
  if (reputation >= 5) return "honored";
  if (reputation >= 3) return "trusted";
  if (reputation >= 1) return "neutral";
  if (reputation <= -1) return "cold";
  return "hostile";
}

/**
 * Calculate effective reputation from direct + rumor influence.
 * Rumors contribute half their weight to effective reputation.
 */
export function calculateEffectiveReputation(
  directReputation: number,
  totalRumorWeight: number,
): number {
  return directReputation + Math.trunc(totalRumorWeight / 2);
}

/**
 * Generate deterministic memory event ID.
 * Format: `${npcId}:${playerId}:${kind}:${logicalIndex}:${sourceId}`
 */
export function generateMemoryEventId(
  npcId: string,
  playerId: string,
  kind: NpcMemoryEventKind,
  logicalIndex: number,
  sourceId: string,
): string {
  return `${npcId}:${playerId}:${kind}:${logicalIndex}:${sourceId}`;
}

/**
 * Generate deterministic rumor ID.
 * Format: `${sourceNpcId}:${playerId}:${sourceEventId}:rumor`
 */
export function generateRumorId(
  sourceNpcId: string,
  playerId: string,
  sourceEventId: string,
): string {
  return `${sourceNpcId}:${playerId}:${sourceEventId}:rumor`;
}

/**
 * Map rumor kind to visual accent color for Cyber-Zen UI.
 */
export function getRumorKindAccent(kind: NpcRumorKind): string {
  switch (kind) {
    case "helped_village":
      return "cyan";
    case "reliable_supplier":
      return "green";
    case "trusted_worker":
      return "violet";
    case "troublemaker":
      return "ruby-muted";
    case "hostile_actor":
      return "ruby";
  }
}

/**
 * Map trust tier to CSS class for Cyber-Zen UI.
 */
export function getTrustTierCssClass(tier: TrustTier): string {
  switch (tier) {
    case "honored":
      return "trust-tier--honored";
    case "trusted":
      return "trust-tier--trusted";
    case "neutral":
      return "trust-tier--neutral";
    case "cold":
      return "trust-tier--cold";
    case "hostile":
      return "trust-tier--hostile";
  }
}