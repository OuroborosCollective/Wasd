/**
 * Phase 7: Identity Repository
 * 
 * In-memory implementation of identity storage.
 * Production can replace with database-backed implementation.
 */

import type {
  CharacterRecord,
  SessionTokenRecord,
  StableIdentity
} from "./types.js";

export interface IdentityRepository {
  getIdentityByStableGuestId(stableGuestId: string): Promise<StableIdentity | null>;
  getIdentityById(identityId: string): Promise<StableIdentity | null>;
  upsertIdentity(identity: StableIdentity): Promise<void>;

  listCharacters(identityId: string): Promise<CharacterRecord[]>;
  getCharacter(characterId: string): Promise<CharacterRecord | null>;
  upsertCharacter(character: CharacterRecord): Promise<void>;

  getSessionToken(token: string): Promise<SessionTokenRecord | null>;
  upsertSessionToken(token: SessionTokenRecord): Promise<void>;
  deleteSessionToken(token: string): Promise<void>;
}

export function createMemoryIdentityRepository(): IdentityRepository {
  const identities = new Map<string, StableIdentity>();
  const identitiesByGuest = new Map<string, string>();
  const characters = new Map<string, CharacterRecord>();
  const tokens = new Map<string, SessionTokenRecord>();

  return {
    async getIdentityByStableGuestId(stableGuestId) {
      const id = identitiesByGuest.get(stableGuestId);
      return id ? identities.get(id) ?? null : null;
    },

    async getIdentityById(identityId) {
      return identities.get(identityId) ?? null;
    },

    async upsertIdentity(identity) {
      identities.set(identity.identityId, { ...identity });

      if (identity.stableGuestId) {
        identitiesByGuest.set(identity.stableGuestId, identity.identityId);
      }
    },

    async listCharacters(identityId) {
      return Array.from(characters.values())
        .filter((character) => character.ownerIdentityId === identityId)
        .map((character) => ({ ...character }));
    },

    async getCharacter(characterId) {
      return characters.get(characterId) ?? null;
    },

    async upsertCharacter(character) {
      characters.set(character.id, { ...character });
    },

    async getSessionToken(token) {
      const record = tokens.get(token);

      if (!record) return null;

      if (record.expiresAtMs < Date.now()) {
        tokens.delete(token);
        return null;
      }

      return { ...record };
    },

    async upsertSessionToken(token) {
      tokens.set(token.token, { ...token });
    },

    async deleteSessionToken(token) {
      tokens.delete(token);
    }
  };
}