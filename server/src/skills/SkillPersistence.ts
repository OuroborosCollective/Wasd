/**
 * SKILL PERSISTENCE INTERFACE
 *
 * Schema 2 stores exact cap-free progression as canonical decimal strings
 * inside each SkillSnapshot while retaining number read-model projections.
 */

import type { PlayerSkillState } from "./SkillTypes.js";
import { normalizePlayerSkillState } from "./SkillTypes.js";

export interface PersistedPlayerSkillState extends PlayerSkillState {
  schemaVersion: 2;
}

export interface SkillPersistenceAdapter {
  loadPlayerSkillState(playerId: string): Promise<PersistedPlayerSkillState | null>;
  savePlayerSkillState(state: PersistedPlayerSkillState): Promise<void>;
  health?(): Promise<{ ok: boolean; driver: string; error?: string }>;
}

/**
 * Normalize/migrate before persistence. Number-only schema-1 input is accepted
 * by normalizePlayerSkillState and always written back as schema 2.
 */
export function createPersistedPlayerSkillState(
  playerId: string,
  state: PlayerSkillState,
): PersistedPlayerSkillState {
  return normalizePlayerSkillState(state, playerId);
}
