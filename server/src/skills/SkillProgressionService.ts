/**
 * SKILL PROGRESSION SERVICE
 *
 * Service layer for skill progression with persistence.
 * Handles hydration and persistence of player skill state.
 *
 * Rules:
 * - No Date.now() for gameplay state
 * - No Math.random()
 * - Persistence failures do not crash gameplay loop
 */

import {
  SkillProgressionStore,
  type SkillEvent,
} from "./SkillProgressionStore";
import {
  createPersistedPlayerSkillState,
  type SkillPersistenceAdapter,
} from "./SkillPersistence";
import type { PlayerSkillState } from "./SkillTypes";

export class SkillProgressionService {
  private readonly hydratedPlayers = new Set<string>();

  constructor(
    private readonly store: SkillProgressionStore,
    private readonly persistence: SkillPersistenceAdapter
  ) {}

  async getPlayerSkillState(playerId: string): Promise<PlayerSkillState> {
    await this.hydratePlayer(playerId);
    return this.store.getPlayerSkillState(playerId);
  }

  async applyEvent(event: SkillEvent): Promise<PlayerSkillState> {
    await this.hydratePlayer(event.playerId);

    const state = this.store.applyEvent(event);

    await this.persistence.savePlayerSkillState(
      createPersistedPlayerSkillState(event.playerId, state)
    );

    return state;
  }

  async restorePlayerSkillState(playerId: string, state: PlayerSkillState): Promise<void> {
    this.store.replacePlayerSkillState(playerId, state);
    this.hydratedPlayers.add(playerId);
    await this.persistence.savePlayerSkillState(
      createPersistedPlayerSkillState(playerId, state),
    );
  }

  async hydratePlayer(playerId: string): Promise<void> {
    if (this.hydratedPlayers.has(playerId)) return;

    const persisted = await this.persistence.loadPlayerSkillState(playerId);
    if (persisted) {
      this.store.replacePlayerSkillState(playerId, persisted);
    }

    this.hydratedPlayers.add(playerId);
  }

  getPersistenceInfo(): { driver: string } {
    return {
      driver: this.persistence?.constructor?.name ?? "unknown",
    };
  }

  clearForTests(): void {
    this.hydratedPlayers.clear();
  }
}
