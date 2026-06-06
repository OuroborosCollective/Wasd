/**
 * CHARACTER PERSISTENCE INTERFACE
 *
 * Persistence adapter interface for character profiles.
 * Deterministic: No Date.now(), no Math.random().
 */

import {
  normalizeCharacterProfile,
  type CharacterProfile,
} from "./CharacterTypes.js";

export interface PersistedCharacterProfile extends CharacterProfile {
  schemaVersion: 1;
}

export interface CharacterPersistenceAdapter {
  loadCharacterProfile(playerId: string): Promise<PersistedCharacterProfile | null>;
  saveCharacterProfile(profile: PersistedCharacterProfile): Promise<void>;
  health?(): Promise<{ ok: boolean; driver: string; error?: string }>;
}

export function createPersistedCharacterProfile(
  playerId: string,
  profile: CharacterProfile,
): PersistedCharacterProfile {
  const normalized = normalizeCharacterProfile(profile, playerId);

  if (!normalized) {
    throw new Error(`Invalid character profile for ${playerId}`);
  }

  return normalized;
}