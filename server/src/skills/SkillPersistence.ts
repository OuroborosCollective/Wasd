/**
 * SKILL PERSISTENCE INTERFACE
 *
 * Defines the persistence adapter interface for skill state.
 *
 * Rules:
 * - No secrets logged
 * - Graceful degradation on errors
 * - Deterministic file operations
 */

import type { PlayerSkillState } from "./SkillTypes";
import { normalizePlayerSkillState } from "./SkillTypes";

export interface PersistedPlayerSkillState extends PlayerSkillState {
  schemaVersion: 1;
}

export interface SkillPersistenceAdapter {
  loadPlayerSkillState(playerId: string): Promise<PersistedPlayerSkillState | null>;
  savePlayerSkillState(state: PersistedPlayerSkillState): Promise<void>;
  health?(): Promise<{ ok: boolean; driver: string; error?: string }>;
}

/**
 * Create a persisted player skill state with normalization.
 * Pure function - deterministic.
 */
export function createPersistedPlayerSkillState(
  playerId: string,
  state: PlayerSkillState
): PersistedPlayerSkillState {
  return normalizePlayerSkillState(state, playerId);
}