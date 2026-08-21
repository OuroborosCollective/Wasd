/**
 * SKILL PROGRESSION STORE
 *
 * Server-authoritative cap-free skill progression store.
 * Deterministic, player-isolated.
 */

import {
  applySkillXp,
  type PlayerSkillState,
  type PlayerSkillStateInput,
  type SkillId,
  normalizePlayerSkillState,
  createDefaultPlayerSkillState,
} from "./SkillTypes.js";

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

  getPlayerSkillState(playerId: string): PlayerSkillState {
    const existing = this.playerSkills.get(playerId);
    if (existing) return normalizePlayerSkillState(existing, playerId);

    const created = createDefaultPlayerSkillState(playerId);
    this.playerSkills.set(playerId, created);
    return created;
  }

  applyEvent(event: SkillEvent): PlayerSkillState {
    if (event.type !== "skill_xp_gain") {
      return this.getPlayerSkillState(event.playerId);
    }

    const amount = Number(event.amount ?? 0);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return this.getPlayerSkillState(event.playerId);
    }

    const state = this.getPlayerSkillState(event.playerId);
    const nextSkills = state.skills.map((skill) =>
      skill.id === event.skillId ? applySkillXp(skill, amount) : skill,
    );

    const nextState = normalizePlayerSkillState(
      {
        playerId: event.playerId,
        schemaVersion: 2,
        skills: nextSkills,
      },
      event.playerId,
    );

    this.playerSkills.set(event.playerId, nextState);
    return nextState;
  }

  /** Replace player skill state and migrate schema-1 number-only snapshots. */
  replacePlayerSkillState(playerId: string, state: PlayerSkillState | PlayerSkillStateInput): void {
    this.playerSkills.set(playerId, normalizePlayerSkillState(state, playerId));
  }

  clearForTests(): void {
    this.playerSkills.clear();
  }
}

export const skillProgressionStore = new SkillProgressionStore();
