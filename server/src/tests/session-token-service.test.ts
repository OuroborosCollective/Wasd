import { describe, expect, it } from "vitest";
import { createSessionTokenService } from "../gameplay/identity/sessionTokenService.js";
import type { IdentityRepository } from "../gameplay/identity/identityRepository.js";
import type { CharacterRecord, SessionTokenRecord, StableIdentity } from "../gameplay/identity/types.js";

function createRepositoryWithToken(record: SessionTokenRecord): IdentityRepository & { deleted: string[] } {
  const deleted: string[] = [];
  return {
    deleted,
    async getIdentityByStableGuestId(): Promise<StableIdentity | null> {
      return null;
    },
    async getIdentityById(): Promise<StableIdentity | null> {
      return null;
    },
    async upsertIdentity(): Promise<void> {},
    async listCharacters(): Promise<CharacterRecord[]> {
      return [];
    },
    async getCharacter(): Promise<CharacterRecord | null> {
      return null;
    },
    async upsertCharacter(): Promise<void> {},
    async getSessionToken(token: string): Promise<SessionTokenRecord | null> {
      return token === record.token ? { ...record } : null;
    },
    async upsertSessionToken(): Promise<void> {},
    async deleteSessionToken(token: string): Promise<void> {
      deleted.push(token);
    },
  };
}

describe("SessionTokenService", () => {
  it("returns active tokens from the repository", async () => {
    const repository = createRepositoryWithToken({
      token: "sess_active",
      identityId: "identity_1",
      playerId: "player_1",
      characterId: "character_1",
      createdAtMs: Date.now() - 1000,
      expiresAtMs: Date.now() + 1000 * 60,
    });
    const service = createSessionTokenService(repository);

    await expect(service.verifyToken("sess_active")).resolves.toMatchObject({
      token: "sess_active",
      identityId: "identity_1",
      playerId: "player_1",
    });
    expect(repository.deleted).toEqual([]);
  });

  it("rejects and deletes expired tokens even when the repository returns them", async () => {
    const repository = createRepositoryWithToken({
      token: "sess_expired",
      identityId: "identity_1",
      playerId: "player_1",
      characterId: "character_1",
      createdAtMs: Date.now() - 1000 * 60,
      expiresAtMs: Date.now() - 1,
    });
    const service = createSessionTokenService(repository);

    await expect(service.verifyToken("sess_expired")).resolves.toBeNull();
    expect(repository.deleted).toEqual(["sess_expired"]);
  });
});
