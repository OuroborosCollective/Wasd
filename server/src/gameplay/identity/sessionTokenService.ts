/** @are-telemetry-side-channel Non-deterministic timestamps for identity/persistence only.
 * Phase 7: Session Token Service
 * 
 * Creates and verifies server-side session tokens.
 * Tokens are opaque and stored in the repository.
 */

import type { IdentityRepository } from "./identityRepository.js";
import type { SessionTokenRecord } from "./types.js";

export interface SessionTokenService {
  createToken(input: {
    identityId: string;
    playerId: string;
    characterId?: string;
  }): Promise<string>;

  verifyToken(token: string): Promise<SessionTokenRecord | null>;
  revokeToken(token: string): Promise<void>;
}

function createOpaqueToken(): string {
  if (globalThis.crypto?.randomUUID) {
    return `sess_${globalThis.crypto.randomUUID()}`;
  }

  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function isExpired(record: SessionTokenRecord, nowMs: number): boolean {
  return record.expiresAtMs <= nowMs;
}

export function createSessionTokenService(
  repository: IdentityRepository
): SessionTokenService {
  return {
    async createToken(input) {
      const token = createOpaqueToken();
      const now = Date.now();

      await repository.upsertSessionToken({
        token,
        identityId: input.identityId,
        playerId: input.playerId,
        characterId: input.characterId,
        createdAtMs: now,
        expiresAtMs: now + 1000 * 60 * 60 * 24 * 14 // 14 days
      });

      return token;
    },

    async verifyToken(token) {
      const record = await repository.getSessionToken(token);
      if (!record) return null;

      if (isExpired(record, Date.now())) {
        await repository.deleteSessionToken(token);
        return null;
      }

      return record;
    },

    async revokeToken(token) {
      await repository.deleteSessionToken(token);
    }
  };
}
