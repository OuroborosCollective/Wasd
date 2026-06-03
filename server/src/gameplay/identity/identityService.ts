/**
 * Phase 7: Identity Service
 * 
 * Main service for identity resolution, character management, and session handling.
 */

import { createCharacterService } from "./characterService.js";
import {
  createMemoryIdentityRepository,
  type IdentityRepository
} from "./identityRepository.js";
import { createSessionTokenService } from "./sessionTokenService.js";
import type { CharacterRecord, IdentityResolution, StableIdentity } from "./types.js";

export interface ResolveIdentityInput {
  stableGuestId?: string;
  sessionToken?: string;
  selectedCharacterId?: string;
  displayName?: string;
}

export interface IdentityService {
  resolve(input: ResolveIdentityInput): Promise<IdentityResolution>;
  listCharacters(identityId: string): Promise<CharacterRecord[]>;
  createCharacter(identityId: string, name?: string): Promise<CharacterRecord>;
}

function createId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStableGuestId(value: string | undefined): string {
  if (!value || !value.startsWith("guest_") || value.length > 96) {
    return createId("guest");
  }

  return value;
}

export function createIdentityService(
  repository: IdentityRepository = createMemoryIdentityRepository()
): IdentityService {
  const tokenService = createSessionTokenService(repository);
  const characters = createCharacterService(repository);

  return {
    async resolve(input) {
      // Try to resume with session token first
      if (input.sessionToken) {
        const token = await tokenService.verifyToken(input.sessionToken);

        if (token) {
          const identity = await repository.getIdentityById(token.identityId);

          if (identity) {
            const owned =
              token.characterId
                ? await characters.getOwnedCharacter(identity.identityId, token.characterId)
                : null;

            const list = await characters.list(identity.identityId);
            const character =
              owned ?? list[0] ?? (await characters.createDefault(identity.identityId, input.displayName));

            const sessionToken = await tokenService.createToken({
              identityId: identity.identityId,
              playerId: character.playerId,
              characterId: character.id
            });

            return {
              identity,
              character,
              sessionToken,
              resumed: true
            };
          }
        }
      }

      // Create or find identity by stableGuestId
      const stableGuestId = normalizeStableGuestId(input.stableGuestId);
      let identity = await repository.getIdentityByStableGuestId(stableGuestId);

      if (!identity) {
        const now = Date.now();

        identity = {
          identityId: createId("identity"),
          kind: "guest",
          stableGuestId,
          createdAtMs: now,
          updatedAtMs: now
        };

        await repository.upsertIdentity(identity);
      }

      // Find or create character
      let character: CharacterRecord | null = null;

      if (input.selectedCharacterId) {
        character = await characters.getOwnedCharacter(
          identity.identityId,
          input.selectedCharacterId
        );
      }

      if (!character) {
        const list = await characters.list(identity.identityId);
        character = list[0] ?? (await characters.createDefault(identity.identityId, input.displayName));
      }

      const sessionToken = await tokenService.createToken({
        identityId: identity.identityId,
        playerId: character.playerId,
        characterId: character.id
      });

      return {
        identity,
        character,
        sessionToken,
        resumed: false
      };
    },

    async listCharacters(identityId) {
      return characters.list(identityId);
    },

    async createCharacter(identityId, name) {
      return characters.createDefault(identityId, name);
    }
  };
}

let singleton: IdentityService | null = null;

export function getIdentityService(): IdentityService {
  if (!singleton) {
    singleton = createIdentityService();
  }

  return singleton;
}