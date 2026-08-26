/**
 * CHARACTER SERVICE
 *
 * Server-authoritative character profile management with persistence hydration.
 * Deterministic: No Date.now(), no Math.random().
 */

import { CharacterStore } from "./CharacterStore.js";
import {
  createPersistedCharacterProfile,
  type CharacterPersistenceAdapter,
} from "./CharacterPersistence.js";
import { applyStartPathStarterKit } from "./StartPathStarterKits.js";
import type {
  CharacterArchetype,
  CharacterCreateResult,
  CharacterProfile,
} from "./CharacterTypes.js";

export class CharacterService {
  private readonly hydratedPlayers = new Set<string>();

  constructor(
    private readonly store: CharacterStore,
    private readonly persistence: CharacterPersistenceAdapter,
  ) {}

  async getCharacterProfile(playerId: string): Promise<CharacterProfile | null> {
    await this.hydratePlayer(playerId);
    return this.store.getCharacterProfile(playerId);
  }

  async createCharacter(input: {
    playerId: string;
    displayName: string;
    archetype: CharacterArchetype;
    currentTick: number;
  }): Promise<CharacterCreateResult> {
    await this.hydratePlayer(input.playerId);

    const result = this.store.createCharacter(input);

    if (result.ok && result.profile && result.reason === "created") {
      await this.persistence.saveCharacterProfile(
        createPersistedCharacterProfile(input.playerId, result.profile),
      );

      await applyStartPathStarterKit({
        playerId: input.playerId,
        archetype: result.profile.archetype,
      });
    }

    return result;
  }

  async ensureDefaultCharacter(input: {
    playerId: string;
    currentTick: number;
  }): Promise<CharacterProfile> {
    const existing = await this.getCharacterProfile(input.playerId);
    if (existing) return existing;

    const result = await this.createCharacter({
      playerId: input.playerId,
      displayName: "Wanderer",
      archetype: "wanderer",
      currentTick: input.currentTick,
    });

    if (!result.ok || !result.profile) {
      throw new Error(`Failed to create default character: ${result.reason}`);
    }

    return result.profile;
  }

  async hydratePlayer(playerId: string): Promise<void> {
    if (this.hydratedPlayers.has(playerId)) return;

    const persisted = await this.persistence.loadCharacterProfile(playerId);
    if (persisted) {
      this.store.replaceCharacterProfile(playerId, persisted);
    }

    this.hydratedPlayers.add(playerId);
  }

  clearForTests(): void {
    this.hydratedPlayers.clear();
  }
}
