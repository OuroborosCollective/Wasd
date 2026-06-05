/**
 * SKILL PROGRESSION STORE
 *
 * Server-authoritative skill progression store.
 * Deterministic, player-isolated.
 *
 * Rules:
 * - No Date.now() for skill progression
 * - No Math.random()
 * - Player state isolated by playerId
 * - Pure deterministic state transitions
 */

import {
  type PlayerSkillState,
  type SkillId,
  normalizePlayerSkillState,
  normalizeSkillSnapshot,
  createDefaultPlayerSkillState,
} from "./SkillTypes";

export type SkillEvent =
  | {
      type: "skill_xp_gain";
      playerId: string;
      skillId: SkillId;
      amount: number;
      source: "npc_kill" | "resource_gather" | "crafting" | "quest_reward" | "admin_test";
    };

export class SkillProgressionStore {
  private readonly playerSkills = new Map<string, PlayerSkillState>();

  /**
   * Get player skill state, creating default if needed.
   * Deterministic - same playerId always produces same structure.
   */
  getPlayerSkillState(playerId: string): PlayerSkillState {
    const existing = this.playerSkills.get(playerId);
    if (existing) return normalizePlayerSkillState(existing, playerId);

    const created = createDefaultPlayerSkillState(playerId);
    this.playerSkills.set(playerId, created);
    return created;
  }

  /**
   * Apply a skill event and return updated state.
   * Deterministic - same events produce same state.
   */
  applyEvent(event: SkillEvent): PlayerSkillState {
    if (event.type !== "skill_xp_gain") {
      return this.getPlayerSkillState(event.playerId);
    }

    const amount = Math.max(0, Math.floor(Number(event.amount ?? 0)));
    if (amount <= 0) {
      return this.getPlayerSkillState(event.playerId);
    }

    const state = this.getPlayerSkillState(event.playerId);
    const nextSkills = state.skills.map((skill) => {
      if (skill.id !== event.skillId) return skill;

      return normalizeSkillSnapshot({
        id: skill.id,
        xp: skill.xp + amount,
      });
    });

    const nextState = normalizePlayerSkillState(
      {
        playerId: event.playerId,
        schemaVersion: 1,
        skills: nextSkills,
      },
      event.playerId
    );

    this.playerSkills.set(event.playerId, nextState);
    return nextState;
  }

  /**
   * Replace player skill state (for hydration from persistence).
   */
  replacePlayerSkillState(playerId: string, state: PlayerSkillState): void {
    this.playerSkills.set(playerId, normalizePlayerSkillState(state, playerId));
  }

  /**
   * Clear all state (for testing only).
   */
  clearForTests(): void {
    this.playerSkills.clear();
  }
}

/**
 * Global skill progression store singleton.
 * For runtime use, see SkillProgressionService.
 */
export const skillProgressionStore = new SkillProgressionStore();