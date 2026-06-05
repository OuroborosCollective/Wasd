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

  /**
   * Get player skill state (hydrated from persistence if needed).
   */
  async getPlayerSkillState(playerId: string): Promise<PlayerSkillState> {
    await this.hydratePlayer(playerId);
    return this.store.getPlayerSkillState(playerId);
  }

  /**
   * Apply a skill event and persist the result.
   */
  async applyEvent(event: SkillEvent): Promise<PlayerSkillState> {
    await this.hydratePlayer(event.playerId);

    const state = this.store.applyEvent(event);

    await this.persistence.savePlayerSkillState(
      createPersistedPlayerSkillState(event.playerId, state)
    );

    return state;
  }

  /**
   * Hydrate player state from persistence if not already done.
   */
  async hydratePlayer(playerId: string): Promise<void> {
    if (this.hydratedPlayers.has(playerId)) return;

    const persisted = await this.persistence.loadPlayerSkillState(playerId);
    if (persisted) {
      this.store.replacePlayerSkillState(playerId, persisted);
    }

    this.hydratedPlayers.add(playerId);
  }

  /**
   * Get persistence info for health checks.
   */
  getPersistenceInfo(): { driver: string } {
    return {
      driver: this.persistence?.constructor?.name ?? "unknown",
    };
  }

  /**
   * Clear hydration state (for testing only).
   */
  clearForTests(): void {
    this.hydratedPlayers.clear();
  }
}