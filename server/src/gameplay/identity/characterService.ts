/** @are-telemetry-side-channel Non-deterministic timestamps for identity/persistence only.
 * Phase 7: Character Service
 * 
 * Manages character creation, listing, and retrieval.
 */

import type { IdentityRepository } from "./identityRepository.js";
import type { CharacterRecord } from "./types.js";

export interface CharacterService {
  list(identityId: string): Promise<CharacterRecord[]>;
  getOwnedCharacter(identityId: string, characterId: string): Promise<CharacterRecord | null>;
  createDefault(identityId: string, name?: string): Promise<CharacterRecord>;
}

function createId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createCharacterService(
  repository: IdentityRepository
): CharacterService {
  return {
    async list(identityId) {
      return repository.listCharacters(identityId);
    },

    async getOwnedCharacter(identityId, characterId) {
      const character = await repository.getCharacter(characterId);

      if (!character || character.ownerIdentityId !== identityId) {
        return null;
      }

      return character;
    },

    async createDefault(identityId, name = "Adventurer") {
      const now = Date.now();

      const character: CharacterRecord = {
        id: createId("char"),
        ownerIdentityId: identityId,
        playerId: createId("player"),
        name: name.trim().slice(0, 24) || "Adventurer",
        sceneId: "main",
        x: 256,
        y: 256,
        hp: 100,
        maxHp: 100,
        level: 1,
        createdAtMs: now,
        updatedAtMs: now
      };

      await repository.upsertCharacter(character);

      return character;
    }
  };
}