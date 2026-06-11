/**
 * CHARACTER STORE
 *
 * In-memory character profile store.
 * Deterministic: No Date.now(), no Math.random().
 */

import {
  createDefaultCharacterProfile,
  normalizeCharacterProfile,
  normalizeDisplayName,
  isCharacterArchetype,
  type CharacterCreateInput,
  type CharacterCreateResult,
  type CharacterProfile,
} from "./CharacterTypes.js";

export class CharacterStore {
  private readonly profiles = new Map<string, CharacterProfile>();

  getCharacterProfile(playerId: string): CharacterProfile | null {
    const existing = this.profiles.get(playerId);
    return normalizeCharacterProfile(existing, playerId);
  }

  createCharacter(input: CharacterCreateInput): CharacterCreateResult {
    if (!input.playerId || input.playerId === "anonymous") {
      return {
        ok: false,
        playerId: input.playerId,
        reason: "invalid_player",
      };
    }

    if (this.profiles.has(input.playerId)) {
      return {
        ok: true,
        playerId: input.playerId,
        reason: "already_exists",
        profile: this.getCharacterProfile(input.playerId) ?? undefined,
      };
    }

    const displayName = normalizeDisplayName(input.displayName);
    if (!displayName) {
      return {
        ok: false,
        playerId: input.playerId,
        reason: "invalid_name",
      };
    }

    if (!isCharacterArchetype(input.archetype)) {
      return {
        ok: false,
        playerId: input.playerId,
        reason: "invalid_archetype",
      };
    }

    const profile = createDefaultCharacterProfile({
      ...input,
      displayName,
    });

    this.profiles.set(input.playerId, profile);

    return {
      ok: true,
      playerId: input.playerId,
      reason: "created",
      profile,
    };
  }

  replaceCharacterProfile(playerId: string, profile: CharacterProfile): void {
    const normalized = normalizeCharacterProfile(profile, playerId);
    if (normalized) {
      this.profiles.set(playerId, normalized);
    }
  }

  clearForTests(): void {
    this.profiles.clear();
  }
}
